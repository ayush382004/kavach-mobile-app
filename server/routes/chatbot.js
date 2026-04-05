/**
 * Chatbot Route — KavachForWork
 * POST /api/chatbot — proxy to Google Gemini Flash (FREE tier)
 * Get free API key: https://aistudio.google.com/app/apikey
 */
const router = require('express').Router();
const axios = require('axios');

const SYSTEM_PROMPT = `You are Kavach Assistant, the helpful AI support agent for KavachForWork — an AI-powered microinsurance platform protecting outdoor workers (delivery drivers, construction workers, street vendors) from extreme heat in India.
Key facts:
- Weekly premium: ₹29/week (varies by region)
- Payouts: ₹150 at 45°C, ₹300 at 47°C, ₹500 at 50°C+
- Fraud detection: AI Sentry with 8 sensor signals (battery temp, GPS, brightness, etc.)
- ₹100 signup bonus added to wallet on registration
- Supports UPI and bank account payouts
- App built for gig workers: delivery riders, construction workers, street vendors
Be concise, friendly, bilingual (Hindi/English). Use ₹ for rupees. Keep replies under 150 words.`;

router.post('/', async (req, res) => {
  try {
    const { messages } = req.body;
    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({ error: 'messages array required' });
    }

    const apiKey = process.env.GEMINI_API_KEY?.trim();
    if (!apiKey) {
      // No key — return smart local reply based on last message
      const lastUserMsg = messages.filter(m => m.role === 'user').pop()?.content || '';
      return res.json({ reply: getSmartReply(lastUserMsg), source: 'local' });
    }

    // Build Gemini contents array
    const contents = [
      { role: 'user', parts: [{ text: SYSTEM_PROMPT }] },
      { role: 'model', parts: [{ text: 'Understood! I am Kavach Assistant. How can I help you today?' }] },
      ...messages.slice(-8).map(m => ({
        role: m.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: String(m.content).slice(0, 2000) }],
      })),
    ];

    const response = await axios.post(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
      { contents, generationConfig: { maxOutputTokens: 300, temperature: 0.7 } },
      { timeout: 15000, headers: { 'Content-Type': 'application/json' } }
    );

    const reply = response.data?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!reply) throw new Error('Empty response from Gemini');

    return res.json({ reply, source: 'gemini' });
  } catch (err) {
    console.error('[Chatbot] Error:', err.response?.data?.error?.message || err.message);
    // Always return a helpful reply, never a 500
    const lastUserMsg = req.body?.messages?.filter(m => m.role === 'user').pop()?.content || '';
    res.json({ reply: getSmartReply(lastUserMsg), source: 'local' });
  }
});

function getSmartReply(text) {
  const t = text.toLowerCase();
  if (t.includes('hello') || t.includes('hi') || t.includes('namaste') || t.includes('hey')) {
    return 'Namaste! 🙏 Main Kavach Assistant hoon. Main aapki madad kar sakta hoon:\n\n• Insurance claims karne mein\n• Premium aur pricing ke baare mein\n• Wallet aur UPI payouts\n• Sentry AI fraud detection\n\nKya jaanna chahte hain?';
  }
  if (t.includes('claim') || t.includes('file') || t.includes('apply')) {
    return '📋 Claim file karne ke steps:\n1. App mein "Claim" tab open karein\n2. Kavach aapki location ka temperature check karega\n3. Sentry AI device sensors verify karega\n4. Approved amount seedha aapke wallet/UPI mein jayega\n\nMinimum 45°C hona chahiye claim ke liye. ☀️';
  }
  if (t.includes('premium') || t.includes('cost') || t.includes('price') || t.includes('₹29') || t.includes('29')) {
    return '💰 KavachForWork ka weekly premium ₹29 hai (region ke hisab se vary karta hai).\n\nPayouts:\n• 45°C = ₹150\n• 47°C = ₹300\n• 50°C+ = ₹500\n\nWallet mein minimum balance hona chahiye auto-renewal ke liye!';
  }
  if (t.includes('payout') || t.includes('money') || t.includes('payment') || t.includes('upi') || t.includes('bank')) {
    return '💸 Payouts instant processed hote hain approved claims ke baad!\n\nPayment methods:\n• UPI ID (Wallet → Link UPI)\n• Bank account transfer\n• Kavach wallet balance\n\nJaldi payout ke liye UPI link karein.';
  }
  if (t.includes('wallet') || t.includes('balance') || t.includes('top') || t.includes('recharge')) {
    return '💳 Wallet top-up steps:\n1. Wallet tab open karein\n2. Amount choose karein (minimum ₹24)\n3. Payment complete karein\n4. Balance turant update ho jayega\n\nPro tip: ₹100 signup bonus automatically add hota hai!';
  }
  if (t.includes('fraud') || t.includes('sentry') || t.includes('ai') || t.includes('detect') || t.includes('verify')) {
    return '🤖 Sentry AI 8 signals check karta hai:\n• Battery temperature\n• Device screen brightness\n• GPS location jitter\n• Network type (WiFi vs Mobile)\n• Battery drain rate\n• Altitude variance\n\nAC room mein hoke claim nahi kar sakte! 🌡️ System instant detect karta hai.';
  }
  if (t.includes('register') || t.includes('signup') || t.includes('account') || t.includes('join')) {
    return '✅ Register karne ke liye:\n1. "Join Kavach" button click karein\n2. Name, phone, city fill karein\n3. Live location verify karein\n4. Terms accept karein\n5. ₹100 bonus turant mil jayega!\n\nSirf Indian mobile number (6-9 se start) accept hota hai.';
  }
  if (t.includes('temperature') || t.includes('weather') || t.includes('heat') || t.includes('temp') || t.includes('hot')) {
    return '🌡️ Kavach real-time temperature data use karta hai:\n• Open-Meteo API se live temperature\n• Heatwave threshold: 45°C\n• Location automatically detect hoti hai\n\nJab aapke area mein 45°C+, claim file kar sakte ho!';
  }
  if (t.includes('thank') || t.includes('thanks') || t.includes('shukriya') || t.includes('dhanyawad')) {
    return 'Shukriya! 🙏 Aapki madad karke khushi hui. Stay safe and stay covered! Koi aur question ho toh zaroor poochhein. 😊';
  }
  if (t.includes('help') || t.includes('support') || t.includes('contact')) {
    return '📞 Kavach Support:\n• Email: support@kavachforwork.in\n• App ke FAQs section dekhein\n• Is chatbot mein poochhein!\n\nMain in topics mein help kar sakta hoon: Claims, Premium, Wallet, Sentry AI, Registration.';
  }
  return 'Main aapki baat samjha. 🙏 Please in topics mein se kuch poochhein:\n\n• 📋 Claim kaise file karein\n• 💰 Premium aur pricing\n• 💸 Wallet aur payouts\n• 🤖 Sentry AI verification\n• ✅ Account registration\n\nKya jaanna chahte hain?';
}

module.exports = router;
