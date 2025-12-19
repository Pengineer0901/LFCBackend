import express from 'express';
import AILog from '../models/AILog.js';

const router = express.Router();

router.get('/', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 50;
    const offset = parseInt(req.query.offset) || 0;

    // If admin → see all, otherwise only own logs
    const query = {};
    if (req.user?.role !== 'admin') {
      query.userId = req.user.id; // or new mongoose.Types.ObjectId(req.userId)
    }

    const logs = await AILog.find(query)
      .sort({ createdAt: -1 })
      .skip(offset)
      .limit(limit);

    res.json({
      success: true,
      data: logs,
      pagination: { limit, offset, count: logs.length },
    });
  } catch (error) {
    console.error('Error fetching generation logs:', error);
    res
      .status(500)
      .json({ error: 'Failed to fetch generation logs', message: error.message });
  }
});

router.get('/stats', async (req, res) => {
  try {
    const logs = await AILog.find()
      .select('tokensUsed generationTimeMs createdAt');

    const totalTokens = logs.reduce((sum, log) => sum + (log.tokensUsed || 0), 0);
    const avgGenerationTime = logs.length > 0
      ? logs.reduce((sum, log) => sum + (log.generationTimeMs || 0), 0) / logs.length
      : 0;

    const stats = {
      totalRequests: logs.length,
      totalTokens: totalTokens,
      avgGenerationTimeMs: Math.round(avgGenerationTime),
      estimatedCost: (totalTokens / 1000) * 0.03,
    };

    res.json({ success: true, data: stats });
  } catch (error) {
    console.error('Error fetching log stats:', error);
    res.status(500).json({ error: 'Failed to fetch log stats', message: error.message });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const log = await AILog.findById(id);

    if (!log) {
      return res.status(404).json({ error: 'Log not found' });
    }

    res.json({ success: true, data: log });
  } catch (error) {
    console.error('Error fetching log:', error);
    res.status(500).json({ error: 'Failed to fetch log', message: error.message });
  }
});

export default router;
