// api/setup.js — تفعيل Telegram Webhook تلقائياً
// افتح: https://yourapp.vercel.app/api/setup لتفعيله

export default async function handler(req, res) {
  const TOKEN   = process.env.TELEGRAM_BOT_TOKEN;
  const APP_URL = process.env.VERCEL_URL
    ? `https://${process.env.VERCEL_URL}`
    : process.env.APP_URL;

  if (!TOKEN) return res.status(500).json({ error: 'Missing TELEGRAM_BOT_TOKEN' });
  if (!APP_URL) return res.status(500).json({ error: 'Missing VERCEL_URL or APP_URL' });

  const webhookUrl = `${APP_URL}/api/webhook`;

  try {
    // تفعيل الـ Webhook
    const r = await fetch(`https://api.telegram.org/bot${TOKEN}/setWebhook`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        url: webhookUrl,
        allowed_updates: ['message', 'callback_query'],
        drop_pending_updates: true
      })
    });
    const d = await r.json();

    // إرسال رسالة ترحيب
    if (d.ok && process.env.TELEGRAM_CHAT_ID) {
      await fetch(`https://api.telegram.org/bot${TOKEN}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: process.env.TELEGRAM_CHAT_ID,
          text: `✅ *Silver AI Bot مفعّل!*\n\nاكتب /menu أو /start للبدء`,
          parse_mode: 'Markdown'
        })
      });
    }

    return res.status(200).json({
      ok: d.ok,
      webhook: webhookUrl,
      telegram: d
    });
  } catch(e) {
    return res.status(500).json({ error: e.message });
  }
}
