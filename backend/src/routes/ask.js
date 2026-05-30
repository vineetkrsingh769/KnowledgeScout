const express = require('express');
const { auth } = require('../middleware/auth');
const QuestionCache = require('../models/QuestionCache');
const Document = require('../models/Document');
const { GoogleGenerativeAI } = require('@google/generative-ai');
require('dotenv').config();

const router = express.Router();

// Cosine similarity helper
function cosineSimilarity(vecA, vecB) {
  if (!vecA || !vecB || vecA.length !== vecB.length) return 0;
  let dotProduct = 0.0;
  let normA = 0.0;
  let normB = 0.0;
  for (let i = 0; i < vecA.length; i++) {
    dotProduct += vecA[i] * vecB[i];
    normA += vecA[i] * vecA[i];
    normB += vecB[i] * vecB[i];
  }
  if (normA === 0.0 || normB === 0.0) return 0.0;
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

// Ask question
router.post('/', auth, async (req, res) => {
  try {
    const { query, k = 3, documentId, history = [] } = req.body;

    if (!query) {
      return res.status(400).json({
        error: {
          code: "FIELD_REQUIRED",
          field: "query",
          message: "Query is required"
        }
      });
    }

    // Check cache first (only for single questions without history)
    const canUseCache = !history || history.length === 0;
    if (canUseCache) {
      const cached = await QuestionCache.findOne({ query, userId: req.user.id, documentId: documentId || null });
      if (cached) {
        return res.json({
          answer: cached.answer,
          sources: cached.sources,
          cached: true
        });
      }
    }

    // Get user's documents (optionally filter to a single document)
    const docFilter = { owner: req.user.id };
    if (documentId) {
      docFilter._id = documentId;
    }
    const userDocs = await Document.find(docFilter);
    
    // Generate query embedding if Gemini API key is available
    let queryEmbedding = null;
    if (process.env.GEMINI_API_KEY) {
      try {
        const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
        const embeddingModel = genAI.getGenerativeModel({ model: "gemini-embedding-2" });
        const embedRes = await embeddingModel.embedContent(query);
        if (embedRes && embedRes.embedding && embedRes.embedding.values) {
          queryEmbedding = embedRes.embedding.values;
        }
      } catch (err) {
        console.error("Ask: Query embedding generation failed, using keyword search fallback", err);
      }
    }

    // Perform hybrid or semantic search
    const results = [];
    const queryTerms = query.toLowerCase().split(/\s+/).filter(term => term.length > 2);
    
    userDocs.forEach(doc => {
      doc.pages.forEach(page => {
        let score = 0;
        
        if (queryEmbedding && page.embeddings && page.embeddings.length > 0) {
          score = cosineSimilarity(queryEmbedding, page.embeddings);
        } else {
          // Keyword search fallback
          const pageContent = page.content.toLowerCase();
          queryTerms.forEach(term => {
            const matches = (pageContent.match(new RegExp(term, 'g')) || []).length;
            score += matches;
          });
        }

        const scoreThreshold = queryEmbedding ? 0.15 : 0;
        if (score > scoreThreshold) {
          results.push({
            documentId: doc._id,
            documentName: doc.originalName,
            pageNumber: page.pageNumber,
            content: page.content,
            score: parseFloat(score.toFixed(4))
          });
        }
      });
    });

    // Sort by relevance and take top k
    results.sort((a, b) => b.score - a.score);
    const topResults = results.slice(0, k);

    // Try LLM generation with Gemini if API key is available; otherwise fallback to stitched summary
    let answer = "I couldn't find relevant information in your documents.";
    const hasContext = topResults.length > 0;
    if (hasContext && process.env.GEMINI_API_KEY) {
      try {
        const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
        const model = genAI.getGenerativeModel({ model: 'gemini-3.5-flash' });
        const context = topResults.map(r => `From "${r.documentName}" page ${r.pageNumber}:\n${r.content}`).join('\n\n');
        const prompt = `You are a helpful document assistant. Answer strictly using the provided context. If the answer is not present, say "The answer is not available in the uploaded documents."\n\nContext:\n${context}\n\nQuestion:\n${query}`;
        
        const contents = [];
        // Add chat history context
        if (Array.isArray(history)) {
          history.forEach(msg => {
            contents.push({
              role: msg.role === 'model' ? 'model' : 'user',
              parts: [{ text: msg.content }]
            });
          });
        }
        
        // Add current query with context
        contents.push({
          role: 'user',
          parts: [{ text: prompt }]
        });

        const result = await model.generateContent({ contents });
        const text = result.response.text();
        if (text && text.trim().length > 0) {
          answer = text.trim();
        }
      } catch (e) {
        console.error('Gemini generation error, falling back to summary:', e);
        // Fallback to stitched summary if LLM fails
        const sourceText = topResults.length === 1 ? 
          `Page ${topResults[0].pageNumber} of "${topResults[0].documentName}"` :
          `${topResults.length} different pages`;
        answer = `Based on your documents, I found relevant information in ${sourceText}. ` +
                 `Here's what I found:\n\n` +
                 topResults.map(r => 
                   `From "${r.documentName}" page ${r.pageNumber}: ${r.content.substring(0, 200)}...`
                 ).join('\n\n');
      }
    } else if (hasContext) {
      const sourceText = topResults.length === 1 ? 
        `Page ${topResults[0].pageNumber} of "${topResults[0].documentName}"` :
        `${topResults.length} different pages`;
      answer = `Based on your documents, I found relevant information in ${sourceText}. ` +
               `Here's what I found:\n\n` +
               topResults.map(r => 
                 `From "${r.documentName}" page ${r.pageNumber}: ${r.content.substring(0, 200)}...`
               ).join('\n\n');
    }

    // Cache the result (only if there was no history)
    if (canUseCache) {
      await QuestionCache.create({
        query,
        userId: req.user.id,
        documentId: documentId || null,
        answer,
        sources: topResults
      });
    }

    res.json({
      answer,
      sources: topResults,
      cached: false
    });
  } catch (error) {
    console.error('Ask error:', error);
    res.status(500).json({
      error: {
        code: "QUERY_FAILED",
        message: "Failed to process query"
      }
    });
  }
});

module.exports = router;
