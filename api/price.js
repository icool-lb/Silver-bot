// api/price.js — MetaAPI للسعر Live + Yahoo Finance للشمعات

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') return res.status(200).end();
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Cache-Control', 'no-cache, no-store');

  const TOKEN   = process.env.METAAPI_TOKEN;
  const ACCOUNT = process.env.METAAPI_ACCOUNT_ID;
  const type    = req.query.type   || 'price';
  const tf      = req.query.tf     || 'M5';
  const limit   = parseInt(req.query.limit || '100');

  // ── السعر اللحظي من MetaAPI ───────────────────────────────
  if (type === 'price') {
    if (!TOKEN || !ACCOUNT) return res.status(500).json({ error: 'Missing MetaAPI credentials' });
    try {
      const r = await fetch(
        `https://mt-client-api-v1.london.agiliumtrade.ai/users/current/accounts/${ACCOUNT}/symbols/XAGUSD/current-price`,
        { headers: { 'auth-token': TOKEN, 'Content-Type': 'application/json' } }
      );
      if (!r.ok) throw new Error(`MetaAPI ${r.status}`);
      const d   = await r.json();
      const bid = parseFloat(d.bid || 0);
      const ask = parseFloat(d.ask || 0);
      return res.status(200).json({
        price:  parseFloat(((bid+ask)/2).toFixed(4)),
        bid:    parseFloat(bid.toFixed(4)),
        ask:    parseFloat(ask.toFixed(4)),
        spread: parseFloat((ask-bid).toFixed(4)),
        symbol: 'XAGUSD',
        source: 'metaapi-mt5',
        ts:     Date.now()
      });
    } catch(e) {
      return res.status(500).json({ error: e.message, price: null });
    }
  }

  // ── الشمعات من Yahoo Finance (مجاني بدون key) ────────────
  if (type === 'candles') {
    // Yahoo Finance symbol للفضة
    const yahooSym = 'SI%3DF'; // Silver Futures = SI=F

    // تحويل TF
    const intervalMap = { M5:'5m', M15:'15m', M30:'30m', H1:'1h', H4:'1h', D1:'1d' };
    const rangeMap    = { M5:'5d', M15:'5d',  M30:'5d',  H1:'1mo', H4:'1mo', D1:'6mo' };
    const interval    = intervalMap[tf] || '5m';
    const range       = rangeMap[tf]    || '5d';

    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${yahooSym}?interval=${interval}&range=${range}&includePrePost=false`;

    try {
      const r = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)',
          'Accept': 'application/json',
          'Accept-Language': 'en-US,en;q=0.9'
        }
      });
      if (!r.ok) throw new Error(`Yahoo ${r.status}`);
      const json = await r.json();

      const result    = json?.chart?.result?.[0];
      const timestamps = result?.timestamp || [];
      const quotes    = result?.indicators?.quote?.[0] || {};

      if (!timestamps.length) throw new Error('No data from Yahoo');

      const candles = timestamps.map((t, i) => ({
        t:  t * 1000,
        o:  parseFloat((quotes.open?.[i]  || 0).toFixed(4)),
        h:  parseFloat((quotes.high?.[i]  || 0).toFixed(4)),
        l:  parseFloat((quotes.low?.[i]   || 0).toFixed(4)),
        cl: parseFloat((quotes.close?.[i] || 0).toFixed(4)),
        v:  parseInt(quotes.volume?.[i]   || 0)
      })).filter(c => c.o > 0 && c.h > 0 && c.l > 0 && c.cl > 0);

      return res.status(200).json({
        candles,
        symbol: 'XAGUSD',
        tf,
        count:  candles.length,
        source: 'yahoo-finance',
        ts:     Date.now()
      });

    } catch(e) {
      // Fallback: Stooq
      try {
        const stooqInterval = { M5:'5', M15:'15', M30:'30', H1:'60' };
        const si = stooqInterval[tf] || '5';
        const stooqUrl = `https://stooq.com/q/d/l/?s=xagusd&i=${si}`;
        const r2 = await fetch(stooqUrl, { headers: { 'User-Agent': 'Mozilla/5.0' } });
        if (!r2.ok) throw new Error(`Stooq ${r2.status}`);
        const text = await r2.text();
        const rows = text.trim().split('\n').slice(1); // skip header
        const candles = rows.slice(-limit).map(row => {
          const [date, time, open, high, low, close, volume] = row.split(',');
          return {
            t:  new Date(`${date}T${time || '00:00'}Z`).getTime(),
            o:  parseFloat(open),
            h:  parseFloat(high),
            l:  parseFloat(low),
            cl: parseFloat(close),
            v:  parseInt(volume || 0)
          };
        }).filter(c => c.o > 0);

        return res.status(200).json({
          candles,
          symbol: 'XAGUSD',
          tf,
          count:  candles.length,
          source: 'stooq',
          ts:     Date.now()
        });
      } catch(e2) {
        return res.status(500).json({ error: `Yahoo: ${e.message} | Stooq: ${e2.message}`, candles: [] });
      }
    }
  }

  return res.status(400).json({ error: 'type must be price or candles' });
}
