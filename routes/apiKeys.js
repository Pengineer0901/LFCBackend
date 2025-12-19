import express from 'express';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import APIKey from '../models/APIKey.js';
import { authMiddleware } from '../middleware/auth.js';

const router = express.Router();

router.use(authMiddleware);

function generateApiKey() {
  const key = `lsai_${uuidv4().replace(/-/g, '')}`;
  return key;
}

router.get('/', async (req, res) => {
  try {
    const isAdmin = req.user.role === 'admin';

    const query = isAdmin
      ? {}  // Admin: No filter, sees ALL keys
      : { createdBy: req.user.id }; // User: Only own keys

    const keys = await APIKey.find(query)
      .populate('createdBy', 'name email') // ✅ Populate user info for admin
      .sort({ createdAt: -1 })
      .lean();

    res.json({
      success: true,
      data: keys
    });
  } catch (error) {
    console.error('Error fetching API keys:', error);
    res.status(500).json({ error: 'Failed to fetch API keys', message: error.message });
  }
});

router.post('/', async (req, res) => {
  try {
    const userId = req.user.id;
    const { name, description, scopes, rateLimit, expiresInDays } = req.body;

    if (!name) {
      return res.status(400).json({ error: 'Name is required' });
    }

    // ✅ FIXED: Use schema field names
    const { key, prefix } = APIKey.generateKey();  // Returns {key, prefix}

    let expiresAt = null;
    if (expiresInDays && expiresInDays > 0) {
      expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + expiresInDays);
    }

    const newKey = new APIKey({
      key,           // ✅ Schema field
      prefix,        // ✅ Schema field
      name,
      permissions: scopes || ['read', 'write'],  // ✅ Match schema field
      isActive: true,
      expiresAt,
      createdBy: userId,
    });

    await newKey.save();

    const keyData = newKey.toObject();
    // ✅ Remove sensitive data BEFORE sending
    delete keyData.key;

    res.status(201).json({
      success: true,
      data: {
        ...keyData,
        apiKey: key  // ✅ Send plain key (only once!)
      },
      message: 'API key created successfully. Save this key securely - it will not be shown again.'
    });
  } catch (error) {
    console.error('Error creating API key:', error);
    res.status(500).json({ error: 'Failed to create API key', message: error.message });
  }
});


router.patch('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const updates = req.body;

    // ✅ ADMIN can update ANY key, users only own keys
    const isAdmin = req.user.role === 'admin';

    const query = isAdmin
      ? { _id: id }                                    // Admin: ANY key
      : { _id: id, createdBy: userId };                // User: only OWN keys

    const apiKey = await APIKey.findOne(query);

    if (!apiKey) {
      return res.status(404).json({
        error: 'API key not found or access denied'
      });
    }

    // ✅ Update allowed fields
    const allowedUpdates = ['name', 'description', 'scopes', 'rateLimit', 'isActive'];
    allowedUpdates.forEach(field => {
      if (updates[field] !== undefined) {
        apiKey[field] = updates[field];
      }
    });

    await apiKey.save();

    const keyData = apiKey.toObject();
    delete keyData.keyHash; // Security

    res.json({
      success: true,
      data: keyData
    });
  } catch (error) {
    console.error('Error updating API key:', error);
    res.status(500).json({
      error: 'Failed to update API key'
    });
  }
});


router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const result = await APIKey.deleteOne({ _id: id, createdBy: userId });

    if (result.deletedCount === 0) {
      return res.status(404).json({ error: 'API key not found' });
    }

    res.json({ success: true, message: 'API key deleted successfully' });
  } catch (error) {
    console.error('Error deleting API key:', error);
    res.status(500).json({ error: 'Failed to delete API key', message: error.message });
  }
});

export default router;
