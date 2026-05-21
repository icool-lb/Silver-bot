// api/analyze.js — Claude (Anthropic) Analysis
// الـ API Key محفوظ في Vercel Environment Variables، غير مرئي للمستخدم

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { price, rsi, macd, ema50, ema200, gsr, dxy, session } = req.body;

  if (!price) return res.status(400).json({ error: 'Missing price data' });

  const prompt = `أنت خبير محلل مالي متخصص في الفضة XAG/USD. قدّم تحليلاً متكاملاً واحترافياً.

البيانات الحالية:
- السعر: $${price}
- الجلسة النشطة: ${session || 'غير محددة'}
- RSI(14): ${rsi || 'N/A'}
- MACD: ${macd || 'N/A'}
- EMA50: ${ema50 || 'N/A'}
- EMA200: ${ema200 || 'N/A'}
- Gold/Silver Ratio: ${gsr || 'N/A'}
- DXY (الدولار): ${dxy || 'N/A'}

قدم تحليلاً شاملاً يتضمن:
1. **التحليل الفني المتعدد المدارس** (ICT/SMC، Wyckoff، Elliott Wave، Supply/Demand، Price Action) — وتقاطع نتائجها في توصية واحدة
2. **تأثير الطلب الصيني الصناعي** (ألواح شمسية، EVs، إلكترونيات) على السعر حالياً
3. **تأثير DXY والفيدرالي الأمريكي** على الفضة
4. **التوصية النهائية**: شراء/بيع/انتظار مع نسبة الثقة بالمئة
5. **أفضل جلسة تداول** والوقت المثالي للدخول
6. **مستويات دقيقة**: دخول، وقف خسارة، هدف 1، هدف 2، نسبة R:R

اكتب بالعربية، أسلوب احترافي، مختصر وواضح، لا تزيد عن 400 كلمة.`;

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1000,
        messages: [{ role: 'user', content: prompt }]
      })
    });

    if (!response.ok) {
      const err = await response.json();
      return res.status(500).json({ error: 'Claude API error', details: err });
    }

    const data = await response.json();
    const text = data.content?.map(b => b.text || '').join('') || '';
    return res.status(200).json({ analysis: text, model: 'claude' });

  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}
