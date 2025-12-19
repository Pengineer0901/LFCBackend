import bcrypt from 'bcryptjs';
import APIKey from '../models/APIKey.js';

export const apiKeyAuth = async (req, res, next) => {
  try {
    const apiKey = req.headers['x-api-key'];

    if (!apiKey) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'API key is required. Provide X-API-Key header.'
      });
    }

    const keyPrefix = apiKey.substring(0, 8);

    const keys = await APIKey.find({
      keyPrefix: keyPrefix,
      isActive: true
    });

    if (!keys || keys.length === 0) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Invalid API key'
      });
    }

    let validKey = null;
    for (const key of keys) {
      const isValid = await bcrypt.compare(apiKey, key.keyHash);
      if (isValid) {
        validKey = key;
        break;
      }
    }

    if (!validKey) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Invalid API key'
      });
    }

    if (validKey.expiresAt && new Date(validKey.expiresAt) < new Date()) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'API key has expired'
      });
    }

    validKey.lastUsedAt = new Date();
    await validKey.save();

    req.apiKey = validKey;
    req.user = { id: validKey.createdBy.toString() };

    next();
  } catch (error) {
    console.error('API key auth error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Authentication failed'
    });
  }
};

export const combinedAuth = async (req, res, next) => {
  const apiKey = req.headers['x-api-key'];
  const authHeader = req.headers.authorization;

  if (apiKey) {
    return apiKeyAuth(req, res, next);
  } else if (authHeader && authHeader.startsWith('Bearer ')) {
    const { authMiddleware } = await import('./auth.js');
    return authMiddleware(req, res, next);
  } else {
    return res.status(401).json({
      error: 'Unauthorized',
      message: 'Provide either X-API-Key header or Bearer token in Authorization header'
    });
  }
};
