// api/price.js — Real XAG/USD from MetaAPI (MT5)
// يجلب السعر مباشرة من حساب MT5 عبر MetaAPI

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') return res.status(200).end();
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Cache-Control', 'no-cache, no-store');

  const TOKEN   = process.env.METAAPI_TOKEN;
  const ACCOUNT = process.env.METAAPI_ACCOUNT_ID;

  if (!TOKEN || !ACCOUNT) {
    return res.status(500).json({
      error: 'Missing METAAPI_TOKEN or METAAPI_ACCOUNT_ID in Vercel env',
      price: null
    });
  }

  try {
    // جلب سعر XAGUSD مباشرة من MT5
    const r = await fetch(
      `https://mt-client-api-v1.london.agiliumtrade.ai/users/current/accounts/${ACCOUNT}/symbols/XAGUSD/current-price`,
      {
        headers: {
          'auth-token': TOKEN,
          'Content-Type': 'application/json'
        }
      }
    );

    if (!r.ok) {
      const err = await r.text();
      throw new Error(`MetaAPI ${r.status}: ${err}`);
    }

    const d = await r.json();
    const bid    = parseFloat(d.bid  || 0);
    const ask    = parseFloat(d.ask  || 0);
    const mid    = parseFloat(((bid + ask) / 2).toFixed(4));
    const spread = parseFloat((ask - bid).toFixed(4));

    return res.status(200).json({
      price:  mid,
      bid:    bid,
      ask:    ask,
      spread: spread,
      symbol: d.symbol || 'XAGUSD',
      source: 'metaapi-mt5',
      ts:     Date.now()
    });

  } catch (e) {

    // Fallback: ابحث في قائمة الرموز
    try {
      const r2 = await fetch(
        `https://mt-client-api-v1.london.agiliumtrade.ai/users/current/accounts/${ACCOUNT}/symbols`,
        { headers: { 'auth-token': TOKEN } }
      );
      const symbols = await r2.json();
      const silver = symbols.find(s =>
        s.symbol === 'XAGUSD' || s.symbol === 'SILVER' ||
        s.symbol === 'XAGUSDm' || s.symbol?.includes('XAG')
      );
      if (silver) {
        return res.status(200).json({
          price:  parseFloat(((silver.bid + silver.ask) / 2).toFixed(4)),
          bid:    silver.bid,
          ask:    silver.ask,
          spread: parseFloat((silver.ask - silver.bid).toFixed(4)),
          symbol: silver.symbol,
          source: 'metaapi-symbols',
          ts:     Date.now()
        });
      }
    } catch (_) {}

    return res.status(500).json({
      error: e.message,
      price: null,
      source: 'failed',
      ts: Date.now()
    });
  }
}
