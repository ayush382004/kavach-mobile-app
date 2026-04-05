/**
 * Chatbot Route — KavachForWork
 * POST /api/chatbot — proxy to Claude API
 */
const router = require('express').Router();
const axios = require('axios');
const ANTHROPIC_API_URL = 'https://api.anthropic.com/v1/messages';
const MODEL_FALLBACKS = [
  'claude-sonnet-4-0',
  'claude-sonnet-4-20250514',
  'claude-3-7-sonnet-latest',
  'claude-3-5-sonnet-latest',
];

const SYSTEM = `You are Kavach Assistant, the helpful AI support agent for KavachForWork — an AI-powered microinsurance platform protecting outdoor workers (delivery drivers, construction workers, street vendors) from extreme heat in India.
Key facts: weekly premium ₹29, payouts ₹150/₹300/₹500 for 45/47/50°C+, Random Forest fraud detection, ₹100 signup bonus, instant wallet payouts.
Be concise, friendly, bilingual (Hindi/English). Use ₹ for rupees.`;

router.post('/', async (req, res) => {
  try {
    const { messages } = req.body;
    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({ error: 'messages array required' });
    }

    const apiKey = process.env.ANTHROPIC_API_KEY?.trim();
    if (!apiKey) {
      return res.status(503).json({ reply: 'Chatbot API key is missing on the server.' });
    }

    const sanitizedMessages = messages
      .slice(-10)
      .filter((item) => item && typeof item.content === 'string')
      .map((item) => ({
        role: item.role === 'assistant' ? 'assistant' : 'user',
        content: item.content.trim().slice(0, 4000),
      }))
      .filter((item) => item.content);

    let lastError = null;
    for (const model of MODEL_FALLBACKS) {
      try {
        const response = await axios.post(ANTHROPIC_API_URL, {
          model,
          max_tokens: 500,
          system: SYSTEM,
          messages: sanitizedMessages,
        }, {
          headers: {
            'x-api-key': apiKey,
            'anthropic-version': '2023-06-01',
            'content-type': 'application/json',
          },
          timeout: 20000,
        });

        const reply = response.data.content?.[0]?.text || 'Sorry, I could not generate a response.';
        return res.json({ reply, model });
      } catch (modelErr) {
        lastError = modelErr;
      }
    }

    throw lastError || new Error('Anthropic request failed');
  } catch (err) {
    const details = err.response?.data ? JSON.stringify(err.response.data) : err.message;
    console.error('[Chatbot] Error:', details);
    res.status(500).json({ reply: 'Chatbot temporarily unavailable. Please check the FAQs page or email support@kavachforwork.in' });
  }
});

module.exports = router;
