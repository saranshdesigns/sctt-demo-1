require('dotenv').config();

let client = null;
try {
  const mod = require('openai');
  const OpenAI = mod.OpenAI || mod.default || mod;
  if (process.env.OPENAI_API_KEY) {
    client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  }
} catch (e) {
  console.error('[ai] OpenAI SDK init failed:', e.message);
}

const MODEL = process.env.OPENAI_MODEL || 'gpt-4o-mini';
const cache = new Map();

const LANG_DESC = {
  en: 'clean, friendly English',
  hi: 'Hindi in Devanagari script',
  gu: 'Gujarati in Gujarati script',
  hinglish: 'Hinglish (Hindi-English mix, Roman script, casual)',
  bn: 'Bengali in Bengali script',
  ta: 'Tamil in Tamil script',
  te: 'Telugu in Telugu script',
  mr: 'Marathi in Devanagari script',
  pa: 'Punjabi in Gurmukhi script',
};

const hasKey = () => !!client;

async function detectLanguage(text) {
  if (!client || !text) return { language: 'hinglish' };
  try {
    const r = await client.chat.completions.create({
      model: MODEL,
      messages: [
        {
          role: 'system',
          content:
            'Detect the language of the user\'s message for a WhatsApp chatbot. Return JSON: {"language":"<code>"}. Codes: "en" (pure English — proper nouns like Mumbai/Delhi do NOT count as mixing), "hi" (Hindi in Devanagari script), "gu" (Gujarati script), "hinglish" (Roman-script Hindi or Hindi/English mix like "Mumbai se jana hai" or "mujhe jana hai"), "bn", "ta", "te", "mr", "pa", "other". If the whole sentence reads as normal English prose (even about Indian cities), return "en". Only return "hinglish" when Hindi words/grammar are Romanized.',
        },
        { role: 'user', content: text },
      ],
      response_format: { type: 'json_object' },
      temperature: 0,
      max_tokens: 20,
    });
    const parsed = JSON.parse(r.choices[0].message.content || '{}');
    return { language: parsed.language || 'hinglish' };
  } catch (e) {
    console.error('[ai] detectLanguage error:', e.message);
    return { language: 'hinglish', error: e.message };
  }
}

async function localize(text, lang) {
  if (!client || !text || !lang || lang === 'hinglish') return { text };
  const key = `${lang}::${text}`;
  if (cache.has(key)) return { text: cache.get(key) };
  try {
    const desc = LANG_DESC[lang] || `the language code "${lang}"`;
    const r = await client.chat.completions.create({
      model: MODEL,
      messages: [
        {
          role: 'system',
          content: `Translate chatbot messages for a WhatsApp bus booking bot called SCTT into ${desc}. Keep it short, friendly, casual. Preserve exactly: emojis, numbers, punctuation, currency "₹", booking IDs (SCTT-XXXXX format), city names (Mumbai, Delhi, Bhopal, Pune, etc.), bus type names (AC Sleeper, Non-AC Seater, Volvo Multi-Axle, AC Semi-Sleeper), boarding point names (Dadar, Borivali, Andheri, Thane), and the button keywords Aaj/Kal/Custom. Return ONLY the translated text — no quotes, no commentary.`,
        },
        { role: 'user', content: text },
      ],
      temperature: 0.2,
      max_tokens: 400,
    });
    const out = (r.choices[0].message.content || text).trim().replace(/^["']|["']$/g, '');
    cache.set(key, out);
    return { text: out };
  } catch (e) {
    console.error('[ai] localize error:', e.message);
    return { text, error: e.message };
  }
}

module.exports = { hasKey, detectLanguage, localize };
