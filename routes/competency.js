import express from 'express';
import OpenAI from 'openai';
import AIConfiguration from '../models/AIConfiguration.js';
import AILog from '../models/AILog.js';

const router = express.Router();

router.post('/generate', async (req, res) => {
  try {
    const { industry, organization, jobRole, competencyName } = req.body;

    if (!industry || !jobRole || !competencyName) {
      return res.status(400).json({
        error: 'Missing required fields: industry, jobRole, competencyName'
      });
    }

    const aiConfig = await AIConfiguration.findOne({ isActive: true });

    if (!aiConfig) {
      return res.status(500).json({
        error: 'No active AI configuration found',
        message: 'Please configure OpenAI in Admin Settings'
      });
    }

    const openai = new OpenAI({
      apiKey: aiConfig.apiKey,
    });

    const startTime = Date.now();

    const organizationContext = organization ? `Organization: ${organization}\n` : '';
    const prompt = `Based on the following context, generate a comprehensive competency definition:

Industry: ${industry}
${organizationContext}Job Role: ${jobRole}
Competency Name: ${competencyName}

Please provide a detailed competency definition with exactly four fields:

1. Description: A clear, professional description of what this competency means in the context of this industry and role (2-3 sentences).

2. Effectively Used: Describe what it looks like when someone demonstrates this competency well. Focus on observable behaviors and positive outcomes (2-3 sentences).

3. Underused: Describe what happens when someone doesn't use this competency enough or fails to demonstrate it adequately. Include potential negative consequences (2-3 sentences).

4. Overused: Describe what it looks like when someone relies too heavily on this competency or uses it inappropriately. Explain the potential downsides of overuse (2-3 sentences).

Return your response in valid JSON format with these exact keys: "description", "effectivelyUsed", "underused", "overused".`;

    const completion = await openai.chat.completions.create({
      model: aiConfig.modelName,
      messages: [
        {
          role: 'system',
          content:
            'You are an expert in organizational development and competency frameworks. You provide clear, professional, and actionable competency definitions.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: aiConfig.temperature,
      max_tokens: aiConfig.maxTokens,
      response_format: { type: 'json_object' }
    });

    const generatedText = completion.choices[0].message.content;
    const competencyData = JSON.parse(generatedText);

    const endTime = Date.now();
    const generationTime = endTime - startTime;

    const log = new AILog({
      requestType: 'competency',
      inputData: { industry, organization, jobRole, competencyName },
      outputData: competencyData,
      modelUsed: aiConfig.modelName,
      tokensUsed: completion.usage?.total_tokens || 0,
      generationTimeMs: generationTime,
      userId: req.user.id,
    });

    await log.save();

    res.json({
      success: true,
      data: competencyData,
      metadata: {
        model: aiConfig.modelName,
        tokens: completion.usage?.total_tokens || 0,
        generationTimeMs: generationTime,
      }
    });
  } catch (error) {
    console.error('Error generating competency:', error);
    res.status(500).json({
      error: 'Failed to generate competency',
      message: error.message
    });
  }
});

export default router;
