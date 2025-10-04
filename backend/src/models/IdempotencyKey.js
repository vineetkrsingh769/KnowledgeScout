const mongoose = require('mongoose');

const idempotencyKeySchema = new mongoose.Schema({
  key: {
    type: String,
    required: true,
    unique: true
  },
  requestHash: String,
  response: mongoose.Schema.Types.Mixed,
  expiresAt: {
    type: Date,
    default: () => new Date(Date.now() + 24 * 60 * 60 * 1000),
    index: { expires: 0 }
  }
});

module.exports = mongoose.model('IdempotencyKey', idempotencyKeySchema);
