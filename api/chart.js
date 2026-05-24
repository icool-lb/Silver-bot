// api/chart.js — Send chart image to Telegram

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).end();
  res.setHeader('Access-Control-Allow-Origin', '*');

  const TOKEN   = process.env.TELEGRAM_BOT_TOKEN;
  const CHAT_ID = process.env.TELEGRAM_CHAT_ID;
  if (!TOKEN || !CHAT_ID) return res.status(500).json({ error: 'Missing Telegram credentials' });

  const { image, caption } = req.body;
  if (!image) return res.status(400).json({ error: 'No image data' });

  try {
    // تحويل base64 إلى Buffer
    const buffer   = Buffer.from(image, 'base64');
    const boundary = '----TelegramBoundary' + Date.now();

    // بناء multipart/form-data يدوياً
    const parts = [];
    parts.push(`--${boundary}\r\nContent-Disposition: form-data; name="chat_id"\r\n\r\n${CHAT_ID}`);
    parts.push(`--${boundary}\r\nContent-Disposition: form-data; name="caption"\r\n\r\n${caption||''}`);
    parts.push(`--${boundary}\r\nContent-Disposition: form-data; name="parse_mode"\r\n\r\nMarkdown`);

    const headerPart = `--${boundary}\r\nContent-Disposition: form-data; name="photo"; filename="chart.png"\r\nContent-Type: image/png\r\n\r\n`;
    const footer     = `\r\n--${boundary}--`;

    const headerBuf = Buffer.from(parts.join('\r\n') + '\r\n' + headerPart);
    const footerBuf = Buffer.from(footer);
    const body      = Buffer.concat([headerBuf, buffer, footerBuf]);

    const r = await fetch(`https://api.telegram.org/bot${TOKEN}/sendPhoto`, {
      method: 'POST',
      headers: { 'Content-Type': `multipart/form-data; boundary=${boundary}` },
      body
    });

    const d = await r.json();
    if (!d.ok) throw new Error(d.description || 'Telegram error');
    return res.status(200).json({ ok: true, message_id: d.result?.message_id });
  } catch(e) {
    return res.status(500).json({ error: e.message });
  }
}
