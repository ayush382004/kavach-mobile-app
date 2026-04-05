/**
 * Chatbot Route — KavachForWork
 * POST /api/chatbot — proxy to Claude API
 */
const router = require('express').Router();
const axios = require('axios');

const SYSTEM = `You are Kavach Assistant, the helpful AI support agent for KavachForWork — an AI-powered microinsurance platform protecting outdoor workers (delivery drivers, construction workers, street vendors) from extreme heat in India.
Key facts: weekly premium ₹29, payouts ₹150/₹300/₹500 for 45/47/50°C+, Random Forest fraud detection, ₹100 signup bonus, instant wallet payouts.
Be concise, friendly, bilingual (Hindi/English). Use ₹ for rupees.`;

router.post('/', async (req, res) => {
  try {
    const { messages } = req.body;
    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({ error: 'messages array required' });
    }

    const response = await axios.post('https://api.anthropic.com/v1/messages', {
      model: 'claude-sonnet-4-20250514',
      max_tokens: 500,
      system: SYSTEM,
      messages: messages.slice(-10), // Last 10 messages for context
    }, {
      headers: {
        'x-api-key': process.env.ANTHROPIC_API_KEY || '',
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      timeout: 15000,
    });

    const reply = response.data.content?.[0]?.text || 'Sorry, I could not generate a response.';
    res.json({ reply });
  } catch (err) {
    console.error('[Chatbot] Error:', err.message);
    res.status(500).json({ reply: 'Chatbot temporarily unavailable. Please check the FAQs page or email support@kavachforwork.in' });
  }
});

module.exports = router;
