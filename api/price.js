// api/price.js — Real XAG/USD price + candles from MetaAPI MT5

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') return res.status(200).end();
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Cache-Control', 'no-cache, no-store');

  const TOKEN   = process.env.METAAPI_TOKEN;
  const ACCOUNT = process.env.METAAPI_ACCOUNT_ID;
  const type    = req.query.type || 'price'; // price | candles
  const tf      = req.query.tf   || 'M5';    // M5 M15 M30 H1
  const symbol  = req.query.symbol || 'XAGUSD';

  if (!TOKEN || !ACCOUNT) {
    return res.status(500).json({ error: 'Missing METAAPI_TOKEN or METAAPI_ACCOUNT_ID' });
  }

  const BASE_URL = `https://mt-client-api-v1.london.agiliumtrade.ai/users/current/accounts/${ACCOUNT}`;
  const HEADERS  = { 'auth-token': TOKEN, 'Content-Type': 'application/json' };

  // ── جلب السعر الحالي ─────────────────────────────────────
  if (type === 'price') {
    try {
      const r = await fetch(`${BASE_URL}/symbols/${symbol}/current-price`, { headers: HEADERS });
      if (!r.ok) throw new Error(`MetaAPI ${r.status}: ${await r.text()}`);
      const d = await r.json();

      let bid = parseFloat(d.bid || 0);
      let ask = parseFloat(d.ask || 0);

      return res.status(200).json({
        price:  parseFloat(((bid + ask) / 2).toFixed(4)),
        bid:    parseFloat(bid.toFixed(4)),
        ask:    parseFloat(ask.toFixed(4)),
        spread: parseFloat((ask - bid).toFixed(4)),
        symbol: d.symbol || symbol,
        source: 'metaapi-mt5',
        ts:     Date.now()
      });
    } catch (e) {
      return res.status(500).json({ error: e.message, price: null });
    }
  }

  // ── جلب الشمعات التاريخية ────────────────────────────────
  if (type === 'candles') {
    // تحويل TF إلى MetaAPI timeframe
    const tfMap = { M5: '5m', M15: '15m', M30: '30m', H1: '1h', H4: '4h', D1: '1d' };
    const mtTF  = tfMap[tf] || '5m';
    const limit = parseInt(req.query.limit || '100');

    try {
      const r = await fetch(
        `${BASE_URL}/history-candles/${symbol}/timeframes/${mtTF}/candles?limit=${limit}`,
        { headers: HEADERS }
      );
      if (!r.ok) throw new Error(`MetaAPI candles ${r.status}: ${await r.text()}`);
      const d = await r.json();

      // d.candles = [{time, open, high, low, close, tickVolume}]
      const candles = (d.candles || d || []).map(c => ({
        t:  new Date(c.time).getTime(),
        o:  parseFloat(c.open),
        h:  parseFloat(c.high),
        l:  parseFloat(c.low),
        cl: parseFloat(c.close),
        v:  parseInt(c.tickVolume || 0)
      }));

      return res.status(200).json({
        candles,
        symbol,
        tf,
        count: candles.length,
        source: 'metaapi-mt5',
        ts: Date.now()
      });
    } catch (e) {
      return res.status(500).json({ error: e.message, candles: [] });
    }
  }

  return res.status(400).json({ error: 'type must be price or candles' });
}
