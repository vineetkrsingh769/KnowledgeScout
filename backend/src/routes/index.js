const express = require('express');
const { auth, adminAuth } = require('../middleware/auth');
const Document = require('../models/Document');
const { GoogleGenerativeAI } = require('@google/generative-ai');

const router = express.Router();

// Rebuild index (admin only)
router.post('/rebuild', auth, adminAuth, async (req, res) => {
  try {
    const documents = await Document.find({});
    let totalDocsReindexed = 0;
    
    if (process.env.GEMINI_API_KEY) {
      const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
      const embeddingModel = genAI.getGenerativeModel({ model: "gemini-embedding-2" });
      
      for (const doc of documents) {
        let docUpdated = false;
        for (let page of doc.pages) {
          if (!page.embeddings || page.embeddings.length === 0) {
            try {
              const resEmbed = await embeddingModel.embedContent(page.content);
              if (resEmbed && resEmbed.embedding && resEmbed.embedding.values) {
                page.embeddings = resEmbed.embedding.values;
                docUpdated = true;
              }
            } catch (embedErr) {
              console.error(`Index Rebuild: Failed embedding for doc ${doc._id} page ${page.pageNumber}:`, embedErr);
            }
          }
        }
        if (docUpdated) {
          await doc.save();
          totalDocsReindexed++;
        }
      }
    }
    
    res.json({
      message: "Index rebuild complete",
      documentsReindexed: totalDocsReindexed,
      status: "success"
    });
  } catch (error) {
    res.status(500).json({
      error: {
        code: "REINDEX_FAILED",
        message: "Failed to rebuild index: " + error.message
      }
    });
  }
});

// Get index stats
router.get('/stats', auth, adminAuth, async (req, res) => {
  try {
    const totalDocs = await Document.countDocuments();
    
    const pageStats = await Document.aggregate([
      { $unwind: "$pages" },
      { $group: { _id: null, totalPages: { $sum: 1 } } }
    ]);
    
    const docsWithEmbeddings = await Document.countDocuments({ 
      "pages.embeddings.0": { $exists: true } 
    });

    res.json({
      totalDocuments: totalDocs,
      totalPages: pageStats[0]?.totalPages || 0,
      documentsWithEmbeddings: docsWithEmbeddings,
      indexedPercentage: totalDocs > 0 ? Math.round((docsWithEmbeddings / totalDocs) * 100) : 0
    });
  } catch (error) {
    res.status(500).json({
      error: {
        code: "STATS_FAILED",
        message: "Failed to fetch index stats"
      }
    });
  }
});

module.exports = router;
