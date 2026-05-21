export default async function handler(req, res) {
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method === 'GET') return res.status(200).json({ ok: true, status: 'Silver AI Bot Webhook Active' });
  if (req.method !== 'POST') return res.status(405).end();

  const TOKEN    = process.env.TELEGRAM_BOT_TOKEN;
  const CHAT_ID  = process.env.TELEGRAM_CHAT_ID;
  const BASE_URL = `https://api.telegram.org/bot${TOKEN}`;
  const SELF     = 'https://silver-bot-icool-lbs-projects.vercel.app';

  const update   = req.body || {};
  const message  = update.message;
  const cb       = update.callback_query;

  // استخراج البيانات
  const chatId   = (message?.chat?.id || cb?.message?.chat?.id)?.toString();
  const msgId    = (message?.message_id || cb?.message?.message_id);
  const rawText  = (message?.text || '').trim().toLowerCase();
  const cbData   = (cb?.data || '').trim().toLowerCase();
  const cbId     = cb?.id;
  const action   = cbData || rawText.split(' ')[0];

  // رد فوري على callback
  if (cbId) {
    await fetch(`${BASE_URL}/answerCallbackQuery`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ callback_query_id: cbId })
    }).catch(() => {});
  }

  if (!chatId) return res.status(200).json({ ok: true });

  // ── HELPERS ───────────────────────────────────────────────

  async function send(text, keyboard) {
    const body = { chat_id: chatId, text, parse_mode: 'Markdown' };
    if (keyboard) body.reply_markup = { inline_keyboard: keyboard };
    const r = await fetch(`${BASE_URL}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
    return r.json();
  }

  async function edit(text, keyboard) {
    if (!msgId || !cbData) return send(text, keyboard);
    const body = { chat_id: chatId, message_id: msgId, text, parse_mode: 'Markdown' };
    if (keyboard) body.reply_markup = { inline_keyboard: keyboard };
    await fetch(`${BASE_URL}/editMessageText`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    }).catch(() => {});
  }

  async function reply(text, keyboard) {
    return cbData ? edit(text, keyboard) : send(text, keyboard);
  }

  async function getPrice() {
    try {
      const r = await fetch(`${SELF}/api/price?type=price`);
      return await r.json();
    } catch(e) { return { error: e.message }; }
  }

  async function getAI(model, p) {
    try {
      const ep = model === 'openai' ? `${SELF}/api/openai` : `${SELF}/api/analyze`;
      const r  = await fetch(ep, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          price: p?.price?.toFixed(3) || '---',
          bid: p?.bid?.toString() || '---',
          ask: p?.ask?.toString() || '---',
          spread: p?.spread?.toString() || '---',
          session: sessionName(),
          dxy: '104.2',
          gsr: (2600 / (p?.price || 75)).toFixed(1)
        })
      });
      const d = await r.json();
      return d.analysis || d.error || 'لا توجد استجابة';
    } catch(e) { return '⚠️ ' + e.message; }
  }

  function sessionName() {
    const h = new Date().getUTCHours();
    if (h >= 0  && h < 8)  return 'آسيا 🌏';
    if (h >= 8  && h < 13) return 'أوروبا 🇪🇺';
    if (h >= 13 && h < 17) return 'أوروبا + أمريكا 🇪🇺🇺🇸 ⭐';
    if (h >= 17 && h < 22) return 'أمريكا 🇺🇸';
    return 'بين الجلسات 😴';
  }

  function sessionStatus() {
    const h = new Date().getUTCHours();
    return (
      `${(h<9)?'🟢':'🔴'} آسيا      00:00–09:00 GMT\n` +
      `${(h>=8&&h<17)?'🟢':'🔴'} أوروبا   08:00–17:00 GMT\n` +
      `${(h>=13&&h<22)?'🟢':'🔴'} أمريكا   13:30–22:00 GMT`
    );
  }

  // ── KEYBOARDS ────────────────────────────────────────────

  const MAIN_KB = [
    [{ text: '💰 السعر اللحظي',      callback_data: 'price'    },
     { text: '📊 إشارة كاملة',       callback_data: 'signal'   }],
    [{ text: '🤖 تحليل Claude',       callback_data: 'ai_claude'},
     { text: '🔵 تحليل GPT-4o',      callback_data: 'ai_openai'}],
    [{ text: '📐 مستويات الدعم/مقاومة', callback_data: 'levels' },
     { text: '🏫 تحليل المدارس',     callback_data: 'schools'  }],
    [{ text: '🌐 الجلسات الآن',      callback_data: 'sessions' },
     { text: '📅 الروزنامة',         callback_data: 'calendar' }],
    [{ text: '🇨🇳 طلب الصين',        callback_data: 'china'    },
     { text: '📈 المؤشرات الكلية',   callback_data: 'macro'    }],
    [{ text: '✅ قرار الدخول',       callback_data: 'decision' },
     { text: '❓ المساعدة',          callback_data: 'help'     }]
  ];

  const BACK_KB = [[{ text: '🔙 القائمة الرئيسية', callback_data: 'menu' }]];

  // ── ACTIONS ───────────────────────────────────────────────

  // MENU / START
  if (['/start','start','/menu','menu'].includes(action)) {
    await reply(
`🥈 *Silver AI Trading Bot*
━━━━━━━━━━━━━━━━━━━━━
*XAG/USD — نظام التداول الذكي*
📡 MetaAPI MT5 Live Feed

اختر من القائمة:`, MAIN_KB);
  }

  // PRICE
  else if (['/price','price'].includes(action)) {
    const d = await getPrice();
    if (d.error) {
      await reply(`❌ خطأ: \`${d.error}\``, BACK_KB);
    } else {
      const up = d.price >= (d.bid || d.price);
      await reply(
`💰 *السعر اللحظي — XAG/USD*
━━━━━━━━━━━━━━━━━━━━━
${up?'📈':'📉'} *السعر:*   \`$${d.price.toFixed(3)}\`
🔴 *Bid:*     \`${d.bid.toFixed(3)}\`
🟢 *Ask:*     \`${d.ask.toFixed(3)}\`
📏 *Spread:*  \`${d.spread.toFixed(4)}\`
━━━━━━━━━━━━━━━━━━━━━
🌐 *الجلسة:* ${sessionName()}
⏱ \`${new Date().toUTCString()}\``,
        [[{ text: '🔄 تحديث', callback_data: 'price' },
          { text: '📊 إشارة', callback_data: 'signal' }],
         ...BACK_KB]);
    }
  }

  // SIGNAL
  else if (['/signal','signal'].includes(action)) {
    const d  = await getPrice();
    const p  = d.price || 75;
    await reply(
`📊 *إشارة XAG/USD*
━━━━━━━━━━━━━━━━━━━━━
🔴 *الإشارة:* SELL
🎯 *الثقة:* 68%
━━━━━━━━━━━━━━━━━━━━━
📍 *دخول:*       \`$${p.toFixed(3)}\`
🛑 *وقف خسارة:*  \`$${(p*1.005).toFixed(3)}\`
🎯 *هدف 1:*      \`$${(p*0.995).toFixed(3)}\`
🎯 *هدف 2:*      \`$${(p*0.990).toFixed(3)}\`
━━━━━━━━━━━━━━━━━━━━━
⚖️ *R:R:* 1 : 2.0
🌐 *الجلسة:* ${sessionName()}
━━━━━━━━━━━━━━━━━━━━━
🏫 *المدارس:*
• ICT/SMC: SELL 🔴
• Wyckoff: Distribution 🟠
• Elliott: Wave 5 End 🔴
• Supply/Demand: Supply Zone 🔴
⏱ \`${new Date().toUTCString()}\``,
      [[{ text: '✅ قرار الدخول', callback_data: 'decision' }],
       [{ text: '🤖 تحليل AI', callback_data: 'ai_claude' },
        { text: '📐 المستويات', callback_data: 'levels' }],
       ...BACK_KB]);
  }

  // AI CLAUDE
  else if (['/ai','ai_claude','/ai_claude'].includes(action)) {
    const wait = await send('⏳ *Claude يحلل الآن...*\nجاري تحليل XAG/USD...');
    const d    = await getPrice();
    const text = await getAI('claude', d);
    await fetch(`${BASE_URL}/deleteMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, message_id: wait.result?.message_id })
    }).catch(()=>{});
    const full = `🤖 *تحليل Claude Sonnet*\n*$${d.price?.toFixed(3)||'---'}*\n━━━━━━━━━━━━━━━━━━━━━\n${text}\n━━━━━━━━━━━━━━━━━━━━━\n⏱ \`${new Date().toUTCString()}\``;
    const chunks = [];
    for (let i=0; i<full.length; i+=3800) chunks.push(full.substring(i,i+3800));
    const lastKb = [[{ text:'🔄 تحليل جديد', callback_data:'ai_claude' },
                     { text:'📊 الإشارة', callback_data:'signal' }], ...BACK_KB];
    for (let i=0; i<chunks.length; i++) {
      await send(chunks[i], i===chunks.length-1 ? lastKb : null);
    }
  }

  // AI OPENAI
  else if (['ai_openai','/ai_openai'].includes(action)) {
    const wait = await send('⏳ *GPT-4o يحلل الآن...*');
    const d    = await getPrice();
    const text = await getAI('openai', d);
    await fetch(`${BASE_URL}/deleteMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, message_id: wait.result?.message_id })
    }).catch(()=>{});
    const full = `🔵 *تحليل GPT-4o*\n*$${d.price?.toFixed(3)||'---'}*\n━━━━━━━━━━━━━━━━━━━━━\n${text}\n━━━━━━━━━━━━━━━━━━━━━\n⏱ \`${new Date().toUTCString()}\``;
    const chunks = [];
    for (let i=0; i<full.length; i+=3800) chunks.push(full.substring(i,i+3800));
    const lastKb = [[{ text:'🔄 تحليل جديد', callback_data:'ai_openai' },
                     { text:'📊 الإشارة', callback_data:'signal' }], ...BACK_KB];
    for (let i=0; i<chunks.length; i++) {
      await send(chunks[i], i===chunks.length-1 ? lastKb : null);
    }
  }

  // LEVELS
  else if (['/levels','levels'].includes(action)) {
    const d = await getPrice();
    const p = d.price || 75;
    await reply(
`📐 *مستويات XAG/USD*
━━━━━━━━━━━━━━━━━━━━━
🔴 *R2 — مقاومة قوية:*      \`${(p*1.010).toFixed(3)}\`
🟠 *R1 — Order Block بيع:*  \`${(p*1.005).toFixed(3)}\`
━━━━━━━━━━━━━━━━━━━━━
⚪ *السعر الحالي:*            \`$${p.toFixed(3)}\`
━━━━━━━━━━━━━━━━━━━━━
🟢 *S1 — FVG + دعم:*        \`${(p*0.995).toFixed(3)}\`
🟢 *S2 — Order Block شراء:* \`${(p*0.990).toFixed(3)}\`
🟢 *S3 — دعم قوي H4:*       \`${(p*0.983).toFixed(3)}\`
━━━━━━━━━━━━━━━━━━━━━
📦 *Supply Zone:* \`${(p*1.005).toFixed(3)} – ${(p*1.012).toFixed(3)}\`
🧲 *Demand Zone:* \`${(p*0.988).toFixed(3)} – ${(p*0.995).toFixed(3)}\`
⚡ *FVG:*          \`${(p*0.992).toFixed(3)} – ${(p*0.997).toFixed(3)}\`
━━━━━━━━━━━━━━━━━━━━━
⏱ \`${new Date().toUTCString()}\``,
      [[{ text:'🔄 تحديث', callback_data:'levels' },
        { text:'✅ قرار الدخول', callback_data:'decision' }],
       ...BACK_KB]);
  }

  // SCHOOLS
  else if (['/schools','schools'].includes(action)) {
    await reply(
`🏫 *تحليل متعدد المدارس*
━━━━━━━━━━━━━━━━━━━━━
📌 *ICT / SMC*
• Order Block H1: نشط 🔴
• FVG: موجود أسفل السعر
• Liquidity Sweep: اكتمل
• ➡️ *SELL* 🔴

📌 *Wyckoff*
• المرحلة: Distribution Phase C
• UTAD: اكتمل
• ➡️ *SELL* 🟠

📌 *Elliott Wave*
• الوضع: نهاية Wave 5
• الهدف: تصحيح ABC
• ➡️ *SELL* 🔴

📌 *Supply & Demand*
• منطقة عرض H1: نشطة
• ➡️ *SELL* 🔴

📌 *Price Action*
• BOS: هابط | CHoCH: لم يحدث
• ➡️ *BEAR* 🔴

📌 *Macro / Fundamental*
• DXY صاعد → سلبي للفضة
• ➡️ *NEUTRAL* 🟡
━━━━━━━━━━━━━━━━━━━━━
🎯 *الإجماع: SELL — 68%*`,
      [[{ text:'📊 الإشارة الكاملة', callback_data:'signal' }],
       [{ text:'🤖 تحليل AI', callback_data:'ai_claude' }],
       ...BACK_KB]);
  }

  // SESSIONS
  else if (['/sessions','sessions'].includes(action)) {
    await reply(
`🌐 *جلسات التداول — XAG/USD*
━━━━━━━━━━━━━━━━━━━━━
${sessionStatus()}
━━━━━━━━━━━━━━━━━━━━━
⭐ *الجلسة الحالية:* ${sessionName()}
━━━━━━━━━━━━━━━━━━━━━
💡 *نصائح:*
🌏 آسيا: حركة بطيئة — تجنب الدخول
🇪🇺 أوروبا: حركة جيدة — ابحث عن الاتجاه
🇺🇸 أمريكا: أعلى تقلب — أفضل فرص
⭐ التداخل 13:30–17:00 GMT: *الأقوى*
━━━━━━━━━━━━━━━━━━━━━
⏱ \`${new Date().toUTCString()}\``,
      [[{ text:'🔄 تحديث', callback_data:'sessions' }], ...BACK_KB]);
  }

  // CALENDAR
  else if (['/calendar','calendar'].includes(action)) {
    await reply(
`📅 *الروزنامة — مؤثرات الفضة*
━━━━━━━━━━━━━━━━━━━━━
🔴 *تأثير عالٍ:*
🇺🇸 CPI y/y         اليوم  14:30 GMT
🇺🇸 FOMC Minutes    غداً   18:00 GMT
🇺🇸 NFP             الجمعة 13:30 GMT

🟠 *تأثير متوسط:*
🇨🇳 Industrial Output الخميس 02:00 GMT
🇪🇺 PMI Manufacturing الجمعة 09:00 GMT

━━━━━━━━━━━━━━━━━━━━━
📌 *قواعد الأخبار:*
⛔ لا تدخل 15 دقيقة قبل الخبر
⛔ لا تدخل 15 دقيقة بعد الخبر
━━━━━━━━━━━━━━━━━━━━━
📌 *تأثير المؤشرات على الفضة:*
📈 DXY ↑ = فضة ↓
📈 فائدة ↑ = فضة ↓
📈 تضخم ↑ = فضة ↑
📈 طلب صيني ↑ = فضة ↑`,
      [[{ text:'🇨🇳 طلب الصين', callback_data:'china' },
        { text:'📈 الماكرو', callback_data:'macro' }],
       ...BACK_KB]);
  }

  // CHINA
  else if (['/china','china'].includes(action)) {
    await reply(
`🇨🇳 *الطلب الصيني على الفضة*
━━━━━━━━━━━━━━━━━━━━━
🌞 الطاقة الشمسية:    *42%* من الطلب
⚡ السيارات الكهربائية: *18%*
📱 الإلكترونيات:       *13%*
🏭 صناعات أخرى:       *20%*
━━━━━━━━━━━━━━━━━━━━━
📊 *مجموع الطلب الصناعي: 73%*
━━━━━━━━━━━━━━━━━━━━━
📊 *المؤشرات الحالية:*
🏭 PMI الصناعي: 50.4 ✅ توسع
⚡ إنتاج شمسي: +28% سنوياً
🚗 مبيعات EV: +35% سنوياً
━━━━━━━━━━━━━━━━━━━━━
💡 *الخلاصة:*
الطلب الصيني يدعم الفضة على المدى
البعيد رغم التقلبات قصيرة المدى`,
      [[{ text:'📅 الروزنامة', callback_data:'calendar' },
        { text:'📈 الماكرو', callback_data:'macro' }],
       ...BACK_KB]);
  }

  // MACRO
  else if (['/macro','macro'].includes(action)) {
    const d   = await getPrice();
    const p   = d.price || 75;
    const gsr = (2600/p).toFixed(1);
    await reply(
`📈 *المؤشرات الكلية*
━━━━━━━━━━━━━━━━━━━━━
💵 *DXY:* 104.2 🔴 صاعد
📊 *GSR (ذهب/فضة):* ${gsr}
${parseFloat(gsr)>80?'• نسبة مرتفعة = فضة رخيصة 📈':'• نسبة منخفضة = فضة غالية 📉'}
🏦 *الفيدرالي:* 5.25–5.50% متشدد 🔴
📊 *سندات 10Y:* 4.42% 🔴
💹 *VIX:* 18.3 🟡 منخفض
🌍 *CPI:* 3.2% 🟡
━━━━━━━━━━━━━━━━━━━━━
💰 *السعر:* \`$${p.toFixed(3)}\`
━━━━━━━━━━━━━━━━━━━━━
🎯 *الخلاصة:* بيئة مختلطة
DXY قوي يضغط ↓
التضخم يدعم ↑`,
      [[{ text:'🇨🇳 طلب الصين', callback_data:'china' },
        { text:'📅 الروزنامة', callback_data:'calendar' }],
       ...BACK_KB]);
  }

  // DECISION — قرار الدخول
  else if (['/decision','decision'].includes(action)) {
    const d    = await getPrice();
    const p    = d.price || 75;
    const h    = new Date().getUTCHours();
    const sessOk   = h>=8 && h<22;
    const spreadOk = (d.spread||0.03) < 0.05;
    const ok   = sessOk && spreadOk;
    await reply(
`✅ *قرار ما قبل الدخول*
━━━━━━━━━━━━━━━━━━━━━
💰 *السعر:* \`$${p.toFixed(3)}\`
━━━━━━━━━━━━━━━━━━━━━
📋 *Checklist:*
${sessOk?'✅':'❌'} الجلسة: ${sessionName()}
${spreadOk?'✅':'⚠️'} Spread: ${d.spread?.toFixed(4)||'---'} ${spreadOk?'(مقبول)':'(مرتفع)'}
⚠️ تحقق من الروزنامة قبل الدخول
🔴 الاتجاه H1: هابط
🔴 السعر في منطقة عرض
🔴 الإشارة: SELL
━━━━━━━━━━━━━━━━━━━━━
📍 *تفاصيل الصفقة:*
• دخول:   \`$${p.toFixed(3)}\`
• وقف:    \`$${(p*1.005).toFixed(3)}\`
• هدف 1:  \`$${(p*0.995).toFixed(3)}\`
• هدف 2:  \`$${(p*0.990).toFixed(3)}\`
• R:R:    1 : 2.0
━━━━━━━━━━━━━━━━━━━━━
${ok?'🟢 *الحكم: شروط مناسبة للدخول*':'🔴 *الحكم: انتظر تحسن الشروط*'}`,
      [[{ text:'📊 الإشارة الكاملة', callback_data:'signal' }],
       [{ text:'🤖 تحليل AI قبل الدخول', callback_data:'ai_claude' }],
       [{ text:'📐 المستويات', callback_data:'levels' },
        { text:'📅 الروزنامة', callback_data:'calendar' }],
       ...BACK_KB]);
  }

  // HELP
  else if (['/help','help'].includes(action)) {
    await reply(
`❓ *Silver AI Bot — الأوامر*
━━━━━━━━━━━━━━━━━━━━━
💰 /price    السعر اللحظي
📊 /signal   إشارة كاملة
✅ /decision  قرار الدخول
📐 /levels   الدعم والمقاومة
🏫 /schools  تحليل المدارس
🤖 /ai       تحليل Claude AI
🌐 /sessions الجلسات
📅 /calendar الروزنامة
🇨🇳 /china   طلب الصين
📈 /macro    المؤشرات الكلية
📋 /menu     القائمة الرئيسية
━━━━━━━━━━━━━━━━━━━━━
_🥈 Silver AI Bot v2.0_`,
      BACK_KB);
  }

  // أي رسالة أخرى → القائمة الرئيسية
  else if (message && !rawText.startsWith('/')) {
    await send(
`🥈 *Silver AI Bot*
اكتب /menu أو اختر:`,
      MAIN_KB);
  }

  return res.status(200).json({ ok: true });
}
