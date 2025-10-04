const { v4: uuidv4 } = require('uuid');
const IdempotencyKey = require('../models/IdempotencyKey');

const idempotency = async (req, res, next) => {
  if (req.method !== 'POST') return next();
  
  const key = req.headers['idempotency-key'];
  if (!key) {
    // Generate a key if not provided
    req.headers['idempotency-key'] = uuidv4();
    return next();
  }

  // Check if we've seen this key
  const existing = await IdempotencyKey.findOne({ key });
  if (existing) {
    return res.status(409).json({
      error: {
        code: "IDEMPOTENCY_CONFLICT",
        message: "Request already processed"
      }
    });
  }

  // Store the key
  await IdempotencyKey.create({ 
    key, 
    expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000)
  });

  next();
};

module.exports = idempotency;
