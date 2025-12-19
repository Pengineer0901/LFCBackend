import express from 'express';
import OpenAI from 'openai';
import fs from 'fs/promises';
import AIConfiguration from '../models/AIConfiguration.js';
import Document from '../models/Document.js';

const router = express.Router();

router.post('/start', async (req, res) => {
  try {
    const { documentIds, model, suffix } = req.body;
    const userId = req.user.id;

    if (!documentIds || !Array.isArray(documentIds) || documentIds.length === 0) {
      return res.status(400).json({
        error: 'Missing required field: documentIds (array of document IDs)'
      });
    }

    const aiConfig = await AIConfiguration.findOne({ isActive: true });

    if (!aiConfig) {
      return res.status(500).json({
        error: 'No active AI configuration found',
        message: 'Please configure OpenAI API key in Admin Settings'
      });
    }

    const openai = new OpenAI({
      apiKey: aiConfig.apiKey,
    });

    const documents = await Document.find({
      _id: { $in: documentIds },
      status: 'completed'
    });

    if (documents.length === 0) {
      return res.status(400).json({
        error: 'No valid documents found',
        message: 'Make sure documents are uploaded and text extraction is completed'
      });
    }

    console.log(`🚀 Starting fine-tuning with ${documents.length} documents...`);

    const trainingData = documents.map(doc => {
      return {
        messages: [
          {
            role: "system",
            content: "You are an expert in organizational development and competency frameworks."
          },
          {
            role: "user",
            content: doc.extractedText.substring(0, 4000)
          },
          {
            role: "assistant",
            content: `Based on the provided context, here are the key competencies and insights: ${doc.extractedText.substring(0, 1000)}`
          }
        ]
      };
    });

    const jsonlContent = trainingData
      .map(item => JSON.stringify(item))
      .join('\n');

    const tempFilePath = `/tmp/training_data_${Date.now()}.jsonl`;
    await fs.writeFile(tempFilePath, jsonlContent);

    console.log(`📝 Created training file with ${trainingData.length} examples`);

    const uploadedFile = await openai.files.create({
      file: await fs.readFile(tempFilePath).then(buffer =>
        new File([buffer], 'training_data.jsonl', { type: 'application/jsonl' })
      ),
      purpose: 'fine-tune'
    });

    await fs.unlink(tempFilePath);

    console.log(`✅ Training file uploaded: ${uploadedFile.id}`);

    const fineTuneJob = await openai.fineTuning.jobs.create({
      training_file: uploadedFile.id,
      model: model || 'gpt-3.5-turbo',
      suffix: suffix || 'leadership-competency'
    });

    console.log(`✅ Fine-tuning job created: ${fineTuneJob.id}`);

    await Document.updateMany(
      { _id: { $in: documentIds } },
      {
        fineTuningJobId: fineTuneJob.id,
        fineTuningStatus: 'pending'
      }
    );

    res.json({
      success: true,
      data: {
        jobId: fineTuneJob.id,
        status: fineTuneJob.status,
        model: fineTuneJob.model,
        trainingFile: uploadedFile.id,
        documentsProcessed: documents.length
      },
      message: `Fine-tuning job created successfully. Job ID: ${fineTuneJob.id}`
    });

  } catch (error) {
    console.error('Error starting fine-tuning:', error);
    res.status(500).json({
      error: 'Failed to start fine-tuning',
      message: error.message
    });
  }
});

router.get('/jobs', async (req, res) => {
  try {
    const aiConfig = await AIConfiguration.findOne({ isActive: true });

    if (!aiConfig) {
      return res.status(500).json({
        error: 'No active AI configuration found'
      });
    }

    const openai = new OpenAI({
      apiKey: aiConfig.apiKey,
    });

    const jobs = await openai.fineTuning.jobs.list({ limit: 20 });

    res.json({
      success: true,
      data: jobs.data
    });

  } catch (error) {
    console.error('Error fetching fine-tuning jobs:', error);
    res.status(500).json({
      error: 'Failed to fetch fine-tuning jobs',
      message: error.message
    });
  }
});

router.get('/jobs/:jobId', async (req, res) => {
  try {
    const { jobId } = req.params;

    const aiConfig = await AIConfiguration.findOne({ isActive: true });

    if (!aiConfig) {
      return res.status(500).json({
        error: 'No active AI configuration found'
      });
    }

    const openai = new OpenAI({
      apiKey: aiConfig.apiKey,
    });

    const job = await openai.fineTuning.jobs.retrieve(jobId);

    await Document.updateMany(
      { fineTuningJobId: jobId },
      { fineTuningStatus: job.status }
    );

    res.json({
      success: true,
      data: job
    });

  } catch (error) {
    console.error('Error fetching fine-tuning job:', error);
    res.status(500).json({
      error: 'Failed to fetch fine-tuning job',
      message: error.message
    });
  }
});

router.post('/jobs/:jobId/cancel', async (req, res) => {
  try {
    const { jobId } = req.params;

    const aiConfig = await AIConfiguration.findOne({ isActive: true });

    if (!aiConfig) {
      return res.status(500).json({
        error: 'No active AI configuration found'
      });
    }

    const openai = new OpenAI({
      apiKey: aiConfig.apiKey,
    });

    const job = await openai.fineTuning.jobs.cancel(jobId);

    await Document.updateMany(
      { fineTuningJobId: jobId },
      { fineTuningStatus: 'cancelled' }
    );

    res.json({
      success: true,
      data: job,
      message: 'Fine-tuning job cancelled successfully'
    });

  } catch (error) {
    console.error('Error cancelling fine-tuning job:', error);
    res.status(500).json({
      error: 'Failed to cancel fine-tuning job',
      message: error.message
    });
  }
});

export default router;
