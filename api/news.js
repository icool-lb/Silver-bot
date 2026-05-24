// api/news.js — Live News Analysis with GPT-4o Web Search
// يبحث عن أحدث الأخبار المؤثرة على الذهب

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).end();
  res.setHeader('Access-Control-Allow-Origin', '*');

  const { price, session, gsr, nextOpen } = req.body;
  const now     = new Date();
  const dateStr = now.toISOString().slice(0, 10);
  const timeStr = now.toUTCString();

  // Prompt احترافي يبحث عن أحدث الأخبار اللحظية
  const prompt = `ابحث الآن في الإنترنت عن أحدث الأخبار المؤثرة على أسعار الذهب XAU/USD اليوم ${dateStr}.

ابحث تحديداً عن:
- تصريحات ترامب عن إيران أو الشرق الأوسط أو الاتفاقيات الدبلوماسية
- أي مفاوضات أو اتفاقيات سلام جديدة (أمريكا-إيران، روسيا-أوكرانيا)
- آخر تصريحات الفيدرالي الأمريكي وتوقعات الفائدة
- بيانات التضخم والاقتصاد الأمريكي الصادرة مؤخراً
- أي توترات جيوسياسية جديدة أو تصعيد عسكري
- قرارات OPEC+ وأسعار النفط وعلاقتها بالذهب
- أخبار DXY والدولار الأمريكي

المعطيات الحالية:
- سعر الذهب: $${price}
- الوقت: ${timeStr}
- الجلسة: ${session}
- GSR: ${gsr}
- السوق: ${nextOpen}

بعد البحث، قدّم التحليل التالي:

**📰 أهم الأخبار الآن:**
(اذكر كل خبر مهم وجدته مع تأثيره المباشر على الذهب ↑ أو ↓)

**🌍 التحليل الجيوسياسي:**
- الوضع الراهن وتأثيره على الذهب كملاذ آمن

**📊 تحليل GAP الافتتاح:**
- هل يُتوقع GAP؟ نعم / لا
- الاتجاه المتوقع: صاعد ↑ / هابط ↓ / محايد
- القيمة التقديرية للـ GAP: $___
- الاحتمالية: ___%
- السبب الرئيسي للـ GAP

**🎯 توقعات الاتجاه:**
- أول 4 ساعات بعد الافتتاح: صاعد / هابط
- المستوى المستهدف: $___
- المستوى المهدد: $___
- R:R التقديري: 1:___

**⚠️ مخاطر وتحذيرات:**
- أحداث قادمة قد تغير الاتجاه (مع المواعيد)

اكتب بالعربية، احترافي ودقيق، لا تزيد عن 450 كلمة.`;

  // حاول gpt-4o-search-preview أولاً
  for (const model of ['gpt-4o-search-preview', 'gpt-4o']) {
    try {
      const body = {
        model,
        max_tokens: 1500,
        messages: [
          {
            role: 'system',
            content: `أنت محلل ذهب خبير. ابحث دائماً عن أحدث الأخبار قبل أي تحليل. التاريخ الحالي: ${dateStr} ${timeStr}`
          },
          { role: 'user', content: prompt }
        ]
      };

      // web search للـ search-preview
      if (model === 'gpt-4o-search-preview') {
        body.web_search_options = { search_context_size: 'high' };
      } else {
        body.temperature = 0.2;
      }

      const r = await fetch('https://api.openai.com/v1/chat/completions', {
        method:  'POST',
        headers: {
          'Content-Type':  'application/json',
          'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`
        },
        body: JSON.stringify(body)
      });

      if (!r.ok) {
        const err = await r.text();
        if (r.status === 404 || r.status === 400) continue; // جرب التالي
        throw new Error(`OpenAI ${r.status}: ${err}`);
      }

      const d    = await r.json();
      const text = d.choices?.[0]?.message?.content || '';
      if (!text) continue;

      return res.status(200).json({
        analysis: text,
        model,
        ts: Date.now()
      });

    } catch(e) {
      if (model === 'gpt-4o') {
        return res.status(500).json({ error: e.message });
      }
      // تابع للـ fallback
    }
  }

  return res.status(500).json({ error: 'All models failed' });
}
