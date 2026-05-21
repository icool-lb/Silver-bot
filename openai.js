// api/openai.js — OpenAI GPT-4o Analysis
// الـ API Key محفوظ في Vercel Environment Variables، غير مرئي للمستخدم

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { price, rsi, macd, ema50, ema200, gsr, dxy, session, mode } = req.body;

  if (!price) return res.status(400).json({ error: 'Missing price data' });

  // وضعان: تحليل عادي أو self-learning (مراجعة صفقة سابقة)
  let prompt = '';

  if (mode === 'review') {
    // مراجعة صفقة سابقة للتعلم الذاتي
    const { entry, exit, direction, result, context } = req.body;
    prompt = `أنت نظام تعلم آلي لتحسين توصيات تداول الفضة XAG/USD.

راجع هذه الصفقة وحدد ما يمكن تحسينه:
- الاتجاه: ${direction}
- سعر الدخول: ${entry}
- سعر الخروج: ${exit}
- النتيجة: ${result} (ربح/خسارة)
- السياق الذي تم فيه الدخول: ${context || 'غير محدد'}

قدم:
1. تحليل سبب النجاح أو الفشل
2. ما كان يجب فعله بشكل مختلف
3. قاعدة جديدة يجب إضافتها للنظام
4. درجة جودة الصفقة من 10

رد بـ JSON فقط بهذا الشكل:
{"reason":"...","improvement":"...","new_rule":"...","score":7,"verdict":"good/bad/neutral"}`;
  } else {
    // تحليل عادي بـ GPT-4o
    prompt = `You are an expert silver XAG/USD trading analyst. Analyze and respond in Arabic.

Current data:
- Price: $${price}
- Session: ${session}
- RSI(14): ${rsi}
- MACD: ${macd}
- EMA50: ${ema50} | EMA200: ${ema200}
- Gold/Silver Ratio: ${gsr}
- DXY: ${dxy}

Provide:
1. Multi-school consensus (ICT, Wyckoff, Elliott, S/D, PA) → one final signal
2. China industrial demand impact (solar panels currently account for 55%+ of silver demand)
3. USD/macro environment assessment
4. Final recommendation: BUY/SELL/WAIT with confidence %
5. Best session to trade
6. Precise levels: Entry, SL, TP1, TP2, R:R ratio

Respond in Arabic, professional tone, max 350 words.`;
  }

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        max_tokens: 1000,
        temperature: 0.3,
        messages: [
          {
            role: 'system',
            content: 'أنت محلل مالي خبير متخصص في الفضة XAG/USD. تجمع بين التحليل الفني والأساسي لإعطاء توصيات دقيقة.'
          },
          { role: 'user', content: prompt }
        ]
      })
    });

    if (!response.ok) {
      const err = await response.json();
      return res.status(500).json({ error: 'OpenAI API error', details: err });
    }

    const data = await response.json();
    const text = data.choices?.[0]?.message?.content || '';

    // إذا كان وضع المراجعة، حاول parse الـ JSON
    if (mode === 'review') {
      try {
        const clean = text.replace(/```json|```/g, '').trim();
        const parsed = JSON.parse(clean);
        return res.status(200).json({ review: parsed, model: 'gpt-4o' });
      } catch {
        return res.status(200).json({ review: { reason: text }, model: 'gpt-4o' });
      }
    }

    return res.status(200).json({ analysis: text, model: 'gpt-4o' });

  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}
