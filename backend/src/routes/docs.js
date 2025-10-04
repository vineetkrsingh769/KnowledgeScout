const express = require('express');
const multer = require('multer');
const pdf = require('pdf-parse');
const fs = require('fs');
const crypto = require('crypto');
const { auth } = require('../middleware/auth');
const Document = require('../models/Document');
const idempotency = require('../middleware/idempotency');

const router = express.Router();

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = '../uploads';
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}-${file.originalname}`);
  }
});

const upload = multer({ 
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/pdf') {
      cb(null, true);
    } else {
      cb(new Error('Only PDF files are allowed'), false);
    }
  }
});

// Upload document
router.post('/', auth, idempotency, upload.single('document'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        error: {
          code: "FILE_REQUIRED",
          message: "Document file is required"
        }
      });
    }

    let content = '';
    
    // Extract text from PDF
    if (req.file.mimetype === 'application/pdf') {
      const dataBuffer = fs.readFileSync(req.file.path);
      const data = await pdf(dataBuffer);
      content = data.text;
      
      // Clean up uploaded file
      fs.unlinkSync(req.file.path);
    }

    // Split content into pages (simplified - using form feed character)
    const pageContents = content.split('\f').filter(page => page.trim().length > 0);
    const pages = pageContents.map((pageContent, index) => ({
      pageNumber: index + 1,
      content: pageContent.trim()
    }));

    const document = await Document.create({
      filename: req.file.filename,
      originalName: req.file.originalname,
      fileType: req.file.mimetype,
      size: req.file.size,
      owner: req.user.id,
      content,
      pages,
      shareToken: crypto.randomBytes(16).toString('hex')
    });

    res.status(201).json({
      document: {
        id: document._id,
        originalName: document.originalName,
        fileType: document.fileType,
        size: document.size,
        pages: document.pages.length,
        uploadedAt: document.uploadedAt
      }
    });
  } catch (error) {
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    res.status(500).json({
      error: {
        code: "UPLOAD_FAILED",
        message: "Document upload failed: " + error.message
      }
    });
  }
});

// Get documents with pagination
router.get('/', auth, async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 10;
    const offset = parseInt(req.query.offset) || 0;

    const documents = await Document.find({ owner: req.user.id })
      .sort({ uploadedAt: -1 })
      .skip(offset)
      .limit(limit)
      .select('-content -pages.embeddings');

    const total = await Document.countDocuments({ owner: req.user.id });

    res.json({
      items: documents,
      next_offset: offset + limit < total ? offset + limit : null,
      total
    });
  } catch (error) {
    res.status(500).json({
      error: {
        code: "FETCH_FAILED",
        message: "Failed to fetch documents"
      }
    });
  }
});

// Get specific document
router.get('/:id', auth, async (req, res) => {
  try {
    const document = await Document.findOne({
      _id: req.params.id,
      $or: [
        { owner: req.user.id },
        { isPrivate: false }
      ]
    }).select('-pages.embeddings');

    if (!document) {
      return res.status(404).json({
        error: {
          code: "DOCUMENT_NOT_FOUND",
          message: "Document not found"
        }
      });
    }

    res.json({ document });
  } catch (error) {
    res.status(500).json({
      error: {
        code: "FETCH_FAILED",
        message: "Failed to fetch document"
      }
    });
  }
});

module.exports = router;
