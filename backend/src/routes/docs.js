const express = require('express');
const multer = require('multer');
const pdf = require('pdf-parse');
const fs = require('fs');
const crypto = require('crypto');
const { auth } = require('../middleware/auth');
const Document = require('../models/Document');
const idempotency = require('../middleware/idempotency');
const QuestionCache = require('../models/QuestionCache');
const { GoogleGenerativeAI } = require('@google/generative-ai');

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
    const allowedTypes = ['application/pdf', 'text/plain', 'text/markdown'];
    const extension = file.originalname.split('.').pop().toLowerCase();
    const allowedExtensions = ['pdf', 'txt', 'md', 'markdown'];
    
    if (allowedTypes.includes(file.mimetype) || allowedExtensions.includes(extension)) {
      cb(null, true);
    } else {
      cb(new Error('Only PDF, TXT, and Markdown files are allowed'), false);
    }
  }
});

// Helper function to split text into chunks
function chunkText(text, size, overlap) {
  const chunks = [];
  let startIndex = 0;
  while (startIndex < text.length) {
    let endIndex = startIndex + size;
    if (endIndex < text.length) {
      const nextSpace = text.indexOf(' ', endIndex);
      const nextNewline = text.indexOf('\n', endIndex);
      let breakIndex = endIndex;
      if (nextSpace !== -1 && (nextSpace - endIndex) < 100) {
        breakIndex = nextSpace;
      } else if (nextNewline !== -1 && (nextNewline - endIndex) < 100) {
        breakIndex = nextNewline;
      }
      endIndex = breakIndex;
    }
    const chunk = text.substring(startIndex, endIndex).trim();
    if (chunk.length > 0) {
      chunks.push(chunk);
    }
    startIndex += size - overlap;
    if (size <= overlap) break;
  }
  return chunks;
}

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
    let pages = [];
    const fileExtension = req.file.originalname.split('.').pop().toLowerCase();
    
    if (req.file.mimetype === 'application/pdf' || fileExtension === 'pdf') {
      const dataBuffer = fs.readFileSync(req.file.path);
      const data = await pdf(dataBuffer);
      content = data.text;
      
      fs.unlinkSync(req.file.path);
      
      const pageContents = content.split('\f').filter(page => page.trim().length > 0);
      let pageNum = 1;
      pageContents.forEach((pageContent) => {
        const trimmed = pageContent.trim();
        if (trimmed.length > 3000) {
          const subChunks = chunkText(trimmed, 2000, 300);
          subChunks.forEach(sub => {
            pages.push({
              pageNumber: pageNum++,
              content: sub
            });
          });
        } else {
          pages.push({
            pageNumber: pageNum++,
            content: trimmed
          });
        }
      });
    } else {
      content = fs.readFileSync(req.file.path, 'utf8');
      fs.unlinkSync(req.file.path);
      
      const chunks = chunkText(content, 1500, 200);
      pages = chunks.map((chunk, index) => ({
        pageNumber: index + 1,
        content: chunk
      }));
    }

    // Generate embeddings if Gemini API key is available
    if (process.env.GEMINI_API_KEY && pages.length > 0) {
      try {
        const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
        const embeddingModel = genAI.getGenerativeModel({ model: "gemini-embedding-2" });
        
        for (let i = 0; i < pages.length; i++) {
          try {
            const resEmbed = await embeddingModel.embedContent(pages[i].content);
            if (resEmbed && resEmbed.embedding && resEmbed.embedding.values) {
              pages[i].embeddings = resEmbed.embedding.values;
            }
          } catch (embedError) {
            console.error(`Failed to generate embedding for page ${pages[i].pageNumber}:`, embedError);
          }
        }
      } catch (err) {
        console.error("Gemini embedding generation failed:", err);
      }
    }

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

// Delete specific document
router.delete('/:id', auth, async (req, res) => {
  try {
    const document = await Document.findOneAndDelete({
      _id: req.params.id,
      owner: req.user.id
    });

    if (!document) {
      return res.status(404).json({
        error: {
          code: "DOCUMENT_NOT_FOUND",
          message: "Document not found"
        }
      });
    }

    // Delete corresponding question caches
    await QuestionCache.deleteMany({ documentId: req.params.id });

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({
      error: {
        code: "DELETE_FAILED",
        message: "Failed to delete document"
      }
    });
  }
});

module.exports = router;
