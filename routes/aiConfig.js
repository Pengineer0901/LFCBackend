import express from 'express';
import AIConfiguration from '../models/AIConfiguration.js';

const router = express.Router();

router.get('/', async (req, res) => {
  try {
    const configs = await AIConfiguration.find()
      .sort({ createdAt: -1 });

    res.json({ success: true, data: configs });
  } catch (error) {
    console.error('Error fetching AI configurations:', error);
    res.status(500).json({ error: 'Failed to fetch AI configurations', message: error.message });
  }
});

router.get('/active', async (req, res) => {
  try {
    const config = await AIConfiguration.findOne({ isActive: true });

    res.json({ success: true, data: config });
  } catch (error) {
    console.error('Error fetching active AI configuration:', error);
    res.status(500).json({ error: 'Failed to fetch active AI configuration', message: error.message });
  }
});

router.post('/', async (req, res) => {
  try {
    const { provider, apiKey, modelName, temperature, maxTokens, isActive } = req.body;
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    if (!apiKey || !modelName) {
      return res.status(400).json({ error: 'Missing required fields: apiKey, modelName' });
    }

    if (isActive) {
      await AIConfiguration.updateMany(
        { isActive: true },
        { isActive: false }
      );
    }

    const config = new AIConfiguration({
      provider: provider || 'openai',
      apiKey,
      modelName,
      temperature: temperature || 0.7,
      maxTokens: maxTokens || 1500,
      isActive: isActive !== undefined ? isActive : true,
      createdBy: userId,
    });

    await config.save();

    console.log(`✅ AI Configuration saved to MongoDB:`, {
      id: config._id,
      provider: config.provider,
      model: config.modelName,
      isActive: config.isActive
    });

    res.status(201).json({ success: true, data: config });
  } catch (error) {
    console.error('Error creating AI configuration:', error);
    res.status(500).json({ error: 'Failed to create AI configuration', message: error.message });
  }
});

router.patch('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    if (updates.isActive) {
      await AIConfiguration.updateMany(
        { isActive: true, _id: { $ne: id } },
        { isActive: false }
      );
    }

    const config = await AIConfiguration.findByIdAndUpdate(
      id,
      updates,
      { new: true, runValidators: true }
    );

    if (!config) {
      return res.status(404).json({ error: 'AI configuration not found' });
    }

    res.json({ success: true, data: config });
  } catch (error) {
    console.error('Error updating AI configuration:', error);
    res.status(500).json({ error: 'Failed to update AI configuration', message: error.message });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const config = await AIConfiguration.findByIdAndDelete(id);

    if (!config) {
      return res.status(404).json({ error: 'AI configuration not found' });
    }

    res.json({ success: true, message: 'AI configuration deleted successfully' });
  } catch (error) {
    console.error('Error deleting AI configuration:', error);
    res.status(500).json({ error: 'Failed to delete AI configuration', message: error.message });
  }
});

export default router;
