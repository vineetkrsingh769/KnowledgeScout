const mongoose = require('mongoose');

const documentSchema = new mongoose.Schema({
  filename: {
    type: String,
    required: true
  },
  originalName: {
    type: String,
    required: true
  },
  fileType: {
    type: String,
    required: true
  },
  size: {
    type: Number,
    required: true
  },
  owner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  content: {
    type: String,
    default: ''
  },
  pages: [{
    pageNumber: {
      type: Number,
      required: true
    },
    content: {
      type: String,
      required: true
    },
    embeddings: [Number]
  }],
  isPrivate: {
    type: Boolean,
    default: true
  },
  shareToken: {
    type: String,
    unique: true
  },
  uploadedAt: {
    type: Date,
    default: Date.now
  }
});

documentSchema.index({ owner: 1, uploadedAt: -1 });
documentSchema.index({ shareToken: 1 });

module.exports = mongoose.model('Document', documentSchema);
