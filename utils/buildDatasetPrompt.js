import client from "./openaiClient.js";  // ✅ Default import (matches your export)


export const buildDatasetPrompt = async (sampleItems) => {
  const subset = sampleItems.slice(0, 30);

  const system = `
You are an expert data engineer. The user will give you sample JSON records.
Your job: create ONE clear, reusable natural-language prompt that instructs a model
how to generate NEW records of the same type, with the same fields, structure,
and style, but different content.

Output ONLY the prompt text. Do not add explanations or examples outside the prompt.
`;

  const user = `
Here are sample JSON records (array):

${JSON.stringify(subset, null, 2)}

Generate ONE generic prompt a user could paste into an LLM to generate more data
with the same schema, style, and semantics.
`;

  const completion = await client.chat.completions.create({
    model: 'gpt-4.1-mini',
    messages: [
      { role: 'system', content: system },
      { role: 'user', content: user },
    ],
    temperature: 0.3,
  });

  const promptText = completion.choices[0]?.message?.content?.trim() || '';
  return promptText;
};
