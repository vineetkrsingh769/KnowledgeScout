const express = require('express');
const { auth } = require('../middleware/auth');
const QuestionCache = require('../models/QuestionCache');
const Document = require('../models/Document');

const router = express.Router();

// Ask question
router.post('/', auth, async (req, res) => {
  try {
    const { query, k = 3 } = req.body;

    if (!query) {
      return res.status(400).json({
        error: {
          code: "FIELD_REQUIRED",
          field: "query",
          message: "Query is required"
        }
      });
    }

    // Check cache first
    const cached = await QuestionCache.findOne({ query });
    if (cached) {
      return res.json({
        answer: cached.answer,
        sources: cached.sources,
        cached: true
      });
    }

    // Get user's documents
    const userDocs = await Document.find({ owner: req.user.id });
    
    // Simple text-based search
    const results = [];
    const queryTerms = query.toLowerCase().split(/\s+/).filter(term => term.length > 2);
    
    userDocs.forEach(doc => {
      doc.pages.forEach(page => {
        const pageContent = page.content.toLowerCase();
        let score = 0;
        
        queryTerms.forEach(term => {
          const matches = (pageContent.match(new RegExp(term, 'g')) || []).length;
          score += matches;
        });

        if (score > 0) {
          results.push({
            documentId: doc._id,
            documentName: doc.originalName,
            pageNumber: page.pageNumber,
            content: page.content.substring(0, 500), // Limit content length
            score
          });
        }
      });
    });

    // Sort by relevance and take top k
    results.sort((a, b) => b.score - a.score);
    const topResults = results.slice(0, k);

    // Generate answer based on top results
    let answer = "I couldn't find relevant information in your documents.";
    if (topResults.length > 0) {
      const sourceText = topResults.length === 1 ? 
        `Page ${topResults[0].pageNumber} of "${topResults[0].documentName}"` :
        `${topResults.length} different pages`;
      
      answer = `Based on your documents, I found relevant information in ${sourceText}. ` +
               `Here's what I found:\n\n` +
               topResults.map(r => 
                 `From "${r.documentName}" page ${r.pageNumber}: ${r.content.substring(0, 200)}...`
               ).join('\n\n');
    }

    // Cache the result
    await QuestionCache.create({
      query,
      answer,
      sources: topResults
    });

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
