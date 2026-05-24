// api/yahoo.js — Yahoo Finance proxy for DXY
// يحل مشكلة CORS عند جلب DXY من المتصفح

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') return res.status(200).end();
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Cache-Control', 'no-cache');

  const { url } = req.query;
  if (!url) return res.status(400).json({ error: 'Missing url' });

  try {
    const r = await fetch(decodeURIComponent(url), {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)',
        'Accept': 'application/json',
        'Accept-Language': 'en-US,en;q=0.9'
      }
    });

    if (!r.ok) throw new Error(`Yahoo ${r.status}`);
    const json   = await r.json();
    const result = json?.chart?.result?.[0];

    if (!result) return res.status(200).json({ candles: [], error: 'No data' });

    const ts = result.timestamp || [];
    const q  = result.indicators?.quote?.[0] || {};

    const candles = ts.map((t, i) => ({
      t:  t * 1000,
      o:  parseFloat((q.open?.[i]  || 0).toFixed(3)),
      h:  parseFloat((q.high?.[i]  || 0).toFixed(3)),
      l:  parseFloat((q.low?.[i]   || 0).toFixed(3)),
      cl: parseFloat((q.close?.[i] || 0).toFixed(3)),
      v:  parseInt(q.volume?.[i]   || 0)
    })).filter(c => c.o > 0 && c.cl > 0);

    return res.status(200).json({
      candles,
      count:  candles.length,
      source: 'yahoo-finance',
      ts:     Date.now()
    });
  } catch(e) {
    return res.status(500).json({ error: e.message, candles: [] });
  }
}
