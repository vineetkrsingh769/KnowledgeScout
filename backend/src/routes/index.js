const express = require('express');
const { auth, adminAuth } = require('../middleware/auth');
const Document = require('../models/Document');

const router = express.Router();

// Rebuild index (admin only)
router.post('/rebuild', auth, adminAuth, async (req, res) => {
  try {
    // Mark all documents as needing reindexing
    await Document.updateMany({}, { $set: { 'pages.$[].embeddings': [] } });
    
    const totalDocs = await Document.countDocuments();
    
    res.json({
      message: "Index rebuild initiated",
      documentsReindexed: totalDocs,
      status: "success"
    });
  } catch (error) {
    res.status(500).json({
      error: {
        code: "REINDEX_FAILED",
        message: "Failed to rebuild index"
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
