import express from 'express';
import AIConfiguration from '../models/AIConfiguration.js';
import AIFeedback from '../models/AIFeedback.js';
import Document from '../models/Document.js';
import AILog from '../models/AILog.js';
import { authenticateToken } from '../middleware/auth.js';
import OpenAI from 'openai';
import APIKey from '../models/APIKey.js';

const router = express.Router();

// ✅ NEW: API Key Auth Middleware (for 3rd party integration)
const verifyAPIKey = async (req, res, next) => {
  try {
    const apiKey = req.headers['x-api-key'] || req.headers['authorization']?.replace('Bearer ', '');
    console.log(apiKey);
    
    if (!apiKey) {
      return res.status(401).json({ error: 'API key required' });
    }

    const apiKeyRecord = await APIKey.findOne({ 
      key: apiKey,  // Assuming you hash keys when creating
      isActive: true 
    });

    if (!apiKeyRecord) {
      return res.status(401).json({ error: 'Invalid or inactive API key' });
    }

    // ✅ Attach user info to req for logging
    req.apiKeyUser = {
      userId: apiKeyRecord.createdBy,
      keyId: apiKeyRecord._id,
      scopes: apiKeyRecord.scopes || []
    };

    next();
  } catch (error) {
    res.status(500).json({ error: 'API key verification failed' });
  }
};


router.post('/competency', verifyAPIKey, async (req, res) => {
  try {
    const { inputText } = req.body;
    const startTime = Date.now();

    if (!inputText || typeof inputText !== 'string' || !inputText.trim()) {
      return res.status(400).json({ error: 'Input text is required' });
    }

    const config = await AIConfiguration.findOne({ isActive: true });
    if (!config) {
      return res.status(500).json({
        error: 'No active AI configuration found',
        message: 'Please configure OpenAI settings first'
      });
    }

    const fineTuneDoc = await Document.findOne({
      purpose: 'fine-tuning',
      status: { $in: ['fine_tuning_ready', 'fine_tuning_completed'] }
    }).sort({ createdAt: -1 });

    const openai = new OpenAI({ apiKey: config.apiKeyEncrypted });

    const systemPrompt = `
You are an expert in leadership and FP&A (Financial Planning & Analysis) competencies.
You MUST respond with VALID JSON ONLY, no markdown, no explanations.
If you wrap the array, use one of these keys only: "roles" or "competencies".
`.trim();

    const userPrompt = `
User Input (context, role, or keywords):
"${inputText}"

Generate EXACTLY 10 distinct competency objects in this JSON format:

[
  {
    "Name": "Short, specific competency name",
    "Description": "One concise role/competency definition (max 10 words).",
    "Effectively Used": "One concise sentence describing positive, effective behavior (max 14 words).",
    "Under Used": "One concise sentence describing consequences when this competency is underused (max 14 words).",
    "Over Used": "One concise sentence describing consequences when this competency is overused (max 14 words).",
    "Development Actions": "One specific, actionable development step (max 14 words)."
  }
]

Rules:
- Return either:
  1) A JSON array with 10 objects, OR
  2) A JSON object with ONE key: "roles" or "competencies", whose value is an array of 10 objects.
- Do NOT include any other keys at the top level.
- No comments, no explanations, no trailing text.
`.trim();

    const completion = await openai.chat.completions.create({
      model: config.modelName || 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      temperature: 0.2,
      max_tokens: 1200
    });

    const responseTime = Date.now() - startTime;
    const aiRaw = completion.choices?.[0]?.message?.content || '';

    let parsedArray;
    try {
      const json = JSON.parse(aiRaw);

      // Accept raw array
      if (Array.isArray(json)) {
        parsedArray = json;
      }
      // Accept wrapped object: { roles: [...] } or { competencies: [...] }
      else if (json && typeof json === 'object') {
        if (Array.isArray(json.roles)) {
          parsedArray = json.roles;
        } else if (Array.isArray(json.competencies)) {
          parsedArray = json.competencies;
        } else {
          // Try to find first array value in object
          const firstArrayKey = Object.keys(json).find(
            (k) => Array.isArray(json[k])
          );
          if (firstArrayKey) {
            parsedArray = json[firstArrayKey];
          } else {
            throw new Error('Top-level object does not contain an array');
          }
        }
      } else {
        throw new Error('Response root is neither array nor object');
      }

      if (!Array.isArray(parsedArray) || parsedArray.length === 0) {
        throw new Error('Extracted value is not a non-empty array');
      }

      // Normalize and cap to 10
      parsedArray = parsedArray.slice(0, 10).map((item) => ({
        Name: item.Name || '',
        Description: item.Description || '',
        'Effectively Used':
          item['Effectively Used'] || item.effectively_used || '',
        'Under Used': item['Under Used'] || item.underused || '',
        'Over Used': item['Over Used'] || item.overused || '',
        'Development Actions':
          item['Development Actions'] || item.development_actions || ''
      }));
    } catch (err) {
      console.error('JSON parse/structure error:', err);
      return res.status(500).json({
        error: 'Failed to parse AI response as competency list',
        message: err.message,
        rawSample: aiRaw.slice(0, 500)
      });
    }
    console.log(parsedArray);
    
    const log = new AILog({
      requestType: 'playground_test',
      inputData: { inputText: inputText.trim() },
      outputData: parsedArray,
      modelUsed: config.modelName,
      tokensUsed: completion.usage?.total_tokens || 0,
      responseTimeMs: responseTime,
      userId: req.apiKeyUser.userId,
      success: true,
      metadata: {
        usedFineTune: !!fineTuneDoc,
        fineTuneDocId: fineTuneDoc?._id || null,
        count: parsedArray.length
      }
    });
    await log.save();

    res.json({
      success: true,
      data: { competencies: parsedArray },
      metadata: {
        model: config.modelName,
        tokens: completion.usage?.total_tokens || 0,
        responseTime,
        count: parsedArray.length
      }
    });
  } catch (error) {
    console.error('Playground test error:', error);
    res.status(500).json({
      error: 'Failed to generate competencies',
      message: error.message
    });
  }
});

router.post('/test', authenticateToken, async (req, res) => {
  try {
    const { inputText } = req.body;
    const startTime = Date.now();

    if (!inputText || typeof inputText !== 'string' || !inputText.trim()) {
      return res.status(400).json({ error: 'Input text is required' });
    }

    const config = await AIConfiguration.findOne({ isActive: true });
    if (!config) {
      return res.status(500).json({
        error: 'No active AI configuration found',
        message: 'Please configure OpenAI settings first'
      });
    }

    const fineTuneDoc = await Document.findOne({
      purpose: 'fine-tuning',
      status: { $in: ['fine_tuning_ready', 'fine_tuning_completed'] }
    }).sort({ createdAt: -1 });

    const openai = new OpenAI({ apiKey: config.apiKeyEncrypted });

    const systemPrompt = `
You are an expert in leadership and FP&A (Financial Planning & Analysis) competencies.
You MUST respond with VALID JSON ONLY, no markdown, no explanations.
If you wrap the array, use one of these keys only: "roles" or "competencies".
`.trim();

    const userPrompt = `
User Input (context, role, or keywords):
"${inputText}"

Generate EXACTLY 10 distinct competency objects in this JSON format:

[
  {
    "Name": "Short, specific competency name",
    "Description": "One concise role/competency definition (max 10 words).",
    "Effectively Used": "One concise sentence describing positive, effective behavior (max 14 words).",
    "Under Used": "One concise sentence describing consequences when this competency is underused (max 14 words).",
    "Over Used": "One concise sentence describing consequences when this competency is overused (max 14 words).",
    "Development Actions": "One specific, actionable development step (max 14 words)."
  }
]

Rules:
- Return either:
  1) A JSON array with 10 objects, OR
  2) A JSON object with ONE key: "roles" or "competencies", whose value is an array of 10 objects.
- Do NOT include any other keys at the top level.
- No comments, no explanations, no trailing text.
`.trim();

    const completion = await openai.chat.completions.create({
      model: config.modelName || 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      temperature: 0.2,
      max_tokens: 1200
    });

    const responseTime = Date.now() - startTime;
    const aiRaw = completion.choices?.[0]?.message?.content || '';

    let parsedArray;
    try {
      const json = JSON.parse(aiRaw);

      // Accept raw array
      if (Array.isArray(json)) {
        parsedArray = json;
      }
      // Accept wrapped object: { roles: [...] } or { competencies: [...] }
      else if (json && typeof json === 'object') {
        if (Array.isArray(json.roles)) {
          parsedArray = json.roles;
        } else if (Array.isArray(json.competencies)) {
          parsedArray = json.competencies;
        } else {
          // Try to find first array value in object
          const firstArrayKey = Object.keys(json).find(
            (k) => Array.isArray(json[k])
          );
          if (firstArrayKey) {
            parsedArray = json[firstArrayKey];
          } else {
            throw new Error('Top-level object does not contain an array');
          }
        }
      } else {
        throw new Error('Response root is neither array nor object');
      }

      if (!Array.isArray(parsedArray) || parsedArray.length === 0) {
        throw new Error('Extracted value is not a non-empty array');
      }

      // Normalize and cap to 10
      parsedArray = parsedArray.slice(0, 10).map((item) => ({
        Name: item.Name || '',
        Description: item.Description || '',
        'Effectively Used':
          item['Effectively Used'] || item.effectively_used || '',
        'Under Used': item['Under Used'] || item.underused || '',
        'Over Used': item['Over Used'] || item.overused || '',
        'Development Actions':
          item['Development Actions'] || item.development_actions || ''
      }));
    } catch (err) {
      console.error('JSON parse/structure error:', err);
      return res.status(500).json({
        error: 'Failed to parse AI response as competency list',
        message: err.message,
        rawSample: aiRaw.slice(0, 500)
      });
    }
    console.log(parsedArray);
    
    const log = new AILog({
      requestType: 'playground_test',
      inputData: { inputText: inputText.trim() },
      outputData: parsedArray,
      modelUsed: config.modelName,
      tokensUsed: completion.usage?.total_tokens || 0,
      responseTimeMs: responseTime,
      userId: req.user.userId,
      success: true,
      metadata: {
        usedFineTune: !!fineTuneDoc,
        fineTuneDocId: fineTuneDoc?._id || null,
        count: parsedArray.length
      }
    });
    await log.save();

    res.json({
      success: true,
      data: { competencies: parsedArray },
      metadata: {
        model: config.modelName,
        tokens: completion.usage?.total_tokens || 0,
        responseTime,
        count: parsedArray.length
      }
    });
  } catch (error) {
    console.error('Playground test error:', error);
    res.status(500).json({
      error: 'Failed to generate competencies',
      message: error.message
    });
  }
});
// **NEW: Helper function to extract competency from malformed text responses**
function extractCompetencyFromText(text) {
  try {
    const lines = text.split('\n').map(line => line.trim());
    
    // Look for common patterns
    const descriptionMatch = lines.find(line => 
      line.toLowerCase().includes('description') || 
      line.length > 50 && !line.includes(':')
    );
    
    const effectivelyMatch = lines.find(line => 
      line.toLowerCase().includes('effectively') || 
      line.toLowerCase().includes('used effectively')
    );
    
    const underusedMatch = lines.find(line => 
      line.toLowerCase().includes('under') || 
      line.toLowerCase().includes('underused')
    );
    
    const overusedMatch = lines.find(line => 
      line.toLowerCase().includes('over') || 
      line.toLowerCase().includes('overused')
    );
    
    return {
      description: descriptionMatch || text.substring(0, 200) + '...',
      effectively_used: effectivelyMatch || '',
      underused: underusedMatch || '',
      overused: overusedMatch || ''
    };
  } catch {
    return null;
  }
}


router.post('/feedback', authenticateToken, async (req, res) => {
  try {
    const {
      prompt,
      aiResponse,
      userFeedback,
      expectedResponse,
      comments,
      industry,
      organization,
      jobRole,
      competencyName,
      modelUsed
    } = req.body;

    if (!prompt || !aiResponse || !userFeedback) {
      return res.status(400).json({
        error: 'Prompt, AI response, and feedback are required'
      });
    }

    const feedback = new AIFeedback({
      prompt,
      aiResponse: typeof aiResponse === 'object' ? JSON.stringify(aiResponse) : aiResponse,
      userFeedback,
      expectedResponse,
      comments,
      industry,
      organization,
      jobRole,
      competencyName,
      modelUsed,
      userId: req.user.userId,
      userName: req.user.name,
      userEmail: req.user.email
    });

    await feedback.save();

    res.json({
      success: true,
      message: 'Feedback submitted successfully',
      data: feedback
    });
  } catch (error) {
    console.error('Feedback submission error:', error);
    res.status(500).json({
      error: 'Failed to submit feedback',
      message: error.message
    });
  }
});

router.get('/feedback', authenticateToken, async (req, res) => {
  try {
    const { limit = 50, feedbackType } = req.query;

    const query = feedbackType ? { userFeedback: feedbackType } : {};

    const feedback = await AIFeedback.find(query)
      .sort({ createdAt: -1 })
      .limit(parseInt(limit));

    const stats = await AIFeedback.aggregate([
      {
        $group: {
          _id: '$userFeedback',
          count: { $sum: 1 }
        }
      }
    ]);

    res.json({
      success: true,
      data: feedback,
      stats: stats.reduce((acc, stat) => {
        acc[stat._id] = stat.count;
        return acc;
      }, {})
    });
  } catch (error) {
    console.error('Feedback fetch error:', error);
    res.status(500).json({
      error: 'Failed to fetch feedback',
      message: error.message
    });
  }
});

export default router;
