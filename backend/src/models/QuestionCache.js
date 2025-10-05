const mongoose = require('mongoose');

const questionCacheSchema = new mongoose.Schema({
  query: {
    type: String,
    required: true,
    index: true
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  documentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Document',
    required: false,
    index: true
  },
  answer: {
    type: String,
    required: true
  },
  sources: [{
    documentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Document',
      required: true
    },
    pageNumber: {
      type: Number,
      required: true
    },
    content: {
      type: String,
      required: true
    },
    documentName: String
  }],
  expiresAt: {
    type: Date,
    default: () => new Date(Date.now() + 60 * 1000),
    index: { expires: 0 }
  }
});

module.exports = mongoose.model('QuestionCache', questionCacheSchema);
