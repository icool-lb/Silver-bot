// api/price.js — MetaAPI MT5 — Price + Candles

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') return res.status(200).end();
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Cache-Control', 'no-cache, no-store');

  const TOKEN   = process.env.METAAPI_TOKEN;
  const ACCOUNT = process.env.METAAPI_ACCOUNT_ID;
  const type    = req.query.type   || 'price';
  const tf      = req.query.tf     || 'M5';
  const symbol  = req.query.symbol || 'XAGUSD';
  const limit   = parseInt(req.query.limit || '100');

  if (!TOKEN || !ACCOUNT) {
    return res.status(500).json({ error: 'Missing METAAPI_TOKEN or METAAPI_ACCOUNT_ID' });
  }

  const HOST    = 'https://mt-client-api-v1.london.agiliumtrade.ai';
  const BASE    = `${HOST}/users/current/accounts/${ACCOUNT}`;
  const HEADERS = { 'auth-token': TOKEN, 'Content-Type': 'application/json' };

  // ── السعر الحالي ─────────────────────────────────────────
  if (type === 'price') {
    try {
      const r = await fetch(`${BASE}/symbols/${symbol}/current-price`, { headers: HEADERS });
      if (!r.ok) throw new Error(`${r.status}: ${await r.text()}`);
      const d = await r.json();
      const bid = parseFloat(d.bid || 0);
      const ask = parseFloat(d.ask || 0);
      return res.status(200).json({
        price:  parseFloat(((bid+ask)/2).toFixed(4)),
        bid:    parseFloat(bid.toFixed(4)),
        ask:    parseFloat(ask.toFixed(4)),
        spread: parseFloat((ask-bid).toFixed(4)),
        symbol: d.symbol || symbol,
        source: 'metaapi-mt5',
        ts:     Date.now()
      });
    } catch(e) {
      return res.status(500).json({ error: e.message, price: null });
    }
  }

  // ── الشمعات التاريخية ────────────────────────────────────
  if (type === 'candles') {

    // MetaAPI الـ endpoint الصحيح للشمعات
    // GET /users/current/accounts/:id/historical-market-data/symbols/:symbol/timeframes/:tf/candles
    const tfMap = { M1:'1m', M5:'5m', M15:'15m', M30:'30m', H1:'1h', H4:'4h', D1:'1d' };
    const mtTF  = tfMap[tf] || '5m';

    // حساب startTime — 100 شمعة للخلف
    const minsMap = { M1:1, M5:5, M15:15, M30:30, H1:60, H4:240, D1:1440 };
    const mins    = minsMap[tf] || 5;
    const startTime = new Date(Date.now() - mins * limit * 60 * 1000).toISOString();

    // المسار الصحيح حسب MetaAPI v1 documentation
    const url = `${BASE}/historical-market-data/symbols/${symbol}/timeframes/${mtTF}/candles?startTime=${encodeURIComponent(startTime)}&limit=${limit}`;

    try {
      const r = await fetch(url, { headers: HEADERS });

      if (!r.ok) {
        const errText = await r.text();

        // جرب المسار البديل
        const url2 = `${BASE}/history-candles/${symbol}/timeframes/${mtTF}?startTime=${encodeURIComponent(startTime)}&limit=${limit}`;
        const r2 = await fetch(url2, { headers: HEADERS });

        if (!r2.ok) {
          // جرب المسار الثالث
          const url3 = `${BASE}/candles/${symbol}/${mtTF}?limit=${limit}`;
          const r3 = await fetch(url3, { headers: HEADERS });
          if (!r3.ok) throw new Error(`All paths failed. Last: ${r3.status} ${await r3.text()}`);
          const d3 = await r3.json();
          return res.status(200).json(formatCandles(d3, symbol, tf));
        }
        const d2 = await r2.json();
        return res.status(200).json(formatCandles(d2, symbol, tf));
      }

      const d = await r.json();
      return res.status(200).json(formatCandles(d, symbol, tf));

    } catch(e) {
      return res.status(500).json({ error: e.message, candles: [] });
    }
  }

  return res.status(400).json({ error: 'type must be price or candles' });
}

function formatCandles(raw, symbol, tf) {
  // MetaAPI يرجع مصفوفة مباشرة أو { candles: [...] }
  const arr = Array.isArray(raw) ? raw : (raw.candles || raw.data || []);
  const candles = arr.map(c => ({
    t:  new Date(c.time || c.openTime || c.timestamp || 0).getTime(),
    o:  parseFloat(c.open  || c.o || 0),
    h:  parseFloat(c.high  || c.h || 0),
    l:  parseFloat(c.low   || c.l || 0),
    cl: parseFloat(c.close || c.c || 0),
    v:  parseInt(c.tickVolume || c.volume || c.v || 0)
  })).filter(c => c.o > 0);

  return { candles, symbol, tf, count: candles.length, source: 'metaapi-mt5', ts: Date.now() };
}
