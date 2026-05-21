// api/telegram.js — Telegram Bot Sender
// الـ Token محفوظ في Vercel Environment Variables، غير مرئي للمستخدم

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { message, type, data } = req.body;

  const TOKEN = process.env.TELEGRAM_BOT_TOKEN;
  const CHAT_ID = process.env.TELEGRAM_CHAT_ID;

  if (!TOKEN || !CHAT_ID) {
    return res.status(500).json({ error: 'Telegram credentials not configured in environment' });
  }

  let text = message || '';

  // بناء رسائل منسقة حسب النوع
  if (type === 'signal' && data) {
    const emoji = data.direction === 'BUY' ? '🟢' : data.direction === 'SELL' ? '🔴' : '🟡';
    text = `${emoji} *إشارة XAG/USD — الفضة*

💰 السعر: \`$${data.price}\`
📊 الإشارة: *${data.direction}*
🎯 الثقة: ${data.confidence}%

📌 *مستويات الصفقة:*
• دخول: \`${data.entry}\`
• وقف خسارة: \`${data.sl}\`
• هدف 1: \`${data.tp1}\`
• هدف 2: \`${data.tp2}\`
• R:R: ${data.rr}

🏫 *تقاطع المدارس:*
• ICT/SMC: ${data.ict || '—'}
• Wyckoff: ${data.wyckoff || '—'}
• Elliott: ${data.elliott || '—'}

🌐 الجلسة: ${data.session || '—'}
⏱ ${new Date().toUTCString()}

_🤖 Silver AI Bot_`;
  }

  else if (type === 'session_alert' && data) {
    const flags = { asia: '🌏', europe: '🇪🇺', us: '🇺🇸' };
    text = `${flags[data.session] || '🌐'} *تنبيه جلسة ${data.sessionName}*

جلسة ${data.sessionName} فتحت الآن
⏰ الوقت: ${data.time} GMT
💰 السعر عند الفتح: \`$${data.price}\`
📊 الاتجاه السائد: ${data.trend}

_انتبه للتقلبات في بداية الجلسة_
_🤖 Silver AI Bot_`;
  }

  else if (type === 'economic_event' && data) {
    const impact = data.impact === 'high' ? '🔴' : data.impact === 'med' ? '🟠' : '⚪';
    text = `${impact} *تنبيه اقتصادي مؤثر على الفضة*

📰 ${data.event}
🏳️ ${data.country}
⏰ ${data.time} GMT
📊 التأثير المتوقع: ${data.impact === 'high' ? 'عالي ⚠️' : data.impact === 'med' ? 'متوسط' : 'منخفض'}

💡 ${data.tip || 'قد يسبب تقلبات — انتبه للمراكز المفتوحة'}

_🤖 Silver AI Bot_`;
  }

  else if (type === 'ai_analysis' && data) {
    // إرسال تحليل AI مقسم (Telegram limit 4096 chars)
    const fullText = `🤖 *تحليل AI للفضة XAG/USD*
المصدر: ${data.model === 'gpt-4o' ? 'OpenAI GPT-4o' : 'Claude Sonnet'}

${data.analysis}

⏱ ${new Date().toUTCString()}
_🤖 Silver AI Bot_`;

    // إرسال على أجزاء إذا كان طويلاً
    const chunks = [];
    for (let i = 0; i < fullText.length; i += 3800) {
      chunks.push(fullText.substring(i, i + 3800));
    }

    try {
      for (const chunk of chunks) {
        await fetch(`https://api.telegram.org/bot${TOKEN}/sendMessage`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ chat_id: CHAT_ID, text: chunk, parse_mode: 'Markdown' })
        });
      }
      return res.status(200).json({ ok: true, chunks: chunks.length });
    } catch (e) {
      return res.status(500).json({ error: e.message });
    }
  }

  // إرسال الرسالة العادية
  try {
    const tgRes = await fetch(`https://api.telegram.org/bot${TOKEN}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: CHAT_ID, text, parse_mode: 'Markdown' })
    });

    const tgData = await tgRes.json();
    if (!tgData.ok) return res.status(500).json({ error: tgData.description });
    return res.status(200).json({ ok: true, message_id: tgData.result?.message_id });

  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}
