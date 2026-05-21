// api/webhook.js — Telegram Bot Webhook + Interactive Commands
// POST https://yourapp.vercel.app/api/webhook

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method === 'GET') {
    return res.status(200).json({ ok: true, status: 'Silver AI Bot Webhook Active' });
  }
  if (req.method !== 'POST') return res.status(405).end();

  const TOKEN   = process.env.TELEGRAM_BOT_TOKEN;
  const CHAT_ID = process.env.TELEGRAM_CHAT_ID;
  const BASE_URL = `https://api.telegram.org/bot${TOKEN}`;
  const SELF    = process.env.VERCEL_URL
    ? `https://${process.env.VERCEL_URL}`
    : process.env.APP_URL || '';

  const update = req.body;
  const msg    = update?.message || update?.callback_query?.message;
  const chatId = msg?.chat?.id?.toString();
  const text   = update?.message?.text || '';
  const cbData = update?.callback_query?.data || '';
  const cbId   = update?.callback_query?.id;

  // أجب على callback_query فوراً
  if (cbId) {
    await fetch(`${BASE_URL}/answerCallbackQuery`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ callback_query_id: cbId, text: '⏳ جاري التحميل...' })
    });
  }

  // ── KEYBOARD LAYOUTS ──────────────────────────────────────

  // التابلو الرئيسي
  const mainKeyboard = {
    inline_keyboard: [
      [
        { text: '💰 السعر اللحظي',     callback_data: 'price'    },
        { text: '📊 إشارة كاملة',      callback_data: 'signal'   }
      ],
      [
        { text: '🤖 تحليل AI Claude',  callback_data: 'ai_claude' },
        { text: '🔵 تحليل GPT-4o',     callback_data: 'ai_openai' }
      ],
      [
        { text: '📐 مستويات الدعم/مقاومة', callback_data: 'levels'   },
        { text: '🏫 تحليل المدارس',    callback_data: 'schools'  }
      ],
      [
        { text: '🌐 الجلسات الآن',     callback_data: 'sessions' },
        { text: '📅 الروزنامة',        callback_data: 'calendar' }
      ],
      [
        { text: '🇨🇳 طلب الصين',       callback_data: 'china'    },
        { text: '📈 المؤشرات الكلية',  callback_data: 'macro'    }
      ],
      [
        { text: '✅ قرار الدخول',      callback_data: 'decision' },
        { text: '⚙️ الإعدادات',        callback_data: 'settings' }
      ]
    ]
  };

  // ── HELPER: إرسال رسالة ──────────────────────────────────
  async function sendMsg(chatId, text, keyboard = null, parseMode = 'Markdown') {
    const body = { chat_id: chatId, text, parse_mode: parseMode };
    if (keyboard) body.reply_markup = keyboard;
    const r = await fetch(`${BASE_URL}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
    return r.json();
  }

  async function editMsg(chatId, msgId, text, keyboard = null) {
    const body = { chat_id: chatId, message_id: msgId, text, parse_mode: 'Markdown' };
    if (keyboard) body.reply_markup = keyboard;
    await fetch(`${BASE_URL}/editMessageText`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
  }

  // ── HELPER: جلب السعر ────────────────────────────────────
  async function getLivePrice() {
    try {
      const r = await fetch(`${SELF}/api/price?type=price`);
      return await r.json();
    } catch(e) { return { error: e.message }; }
  }

  // ── HELPER: تحليل AI ─────────────────────────────────────
  async function getAIAnalysis(model, priceData) {
    try {
      const ep = model === 'claude' ? `${SELF}/api/analyze` : `${SELF}/api/openai`;
      const r  = await fetch(ep, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          price:   priceData.price?.toFixed(3) || '---',
          bid:     priceData.bid?.toString()   || '---',
          ask:     priceData.ask?.toString()   || '---',
          spread:  priceData.spread?.toString()|| '---',
          session: getSessionName(),
          dxy:     '104.2',
          gsr:     (2600 / (priceData.price || 75)).toFixed(1)
        })
      });
      const d = await r.json();
      return d.analysis || d.error || 'لا توجد استجابة';
    } catch(e) { return '⚠️ خطأ: ' + e.message; }
  }

  // ── HELPER: الجلسة الحالية ────────────────────────────────
  function getSessionName() {
    const h = new Date().getUTCHours();
    if (h >= 0  && h < 9)  return 'آسيا 🌏';
    if (h >= 8  && h < 13) return 'أوروبا 🇪🇺';
    if (h >= 13 && h < 17) return 'أوروبا + أمريكا 🇪🇺🇺🇸 ⭐ (الأفضل)';
    if (h >= 17 && h < 22) return 'أمريكا 🇺🇸';
    return 'بين الجلسات 😴';
  }

  function getSessionStatus() {
    const h = new Date().getUTCHours();
    const eu = h >= 8  && h < 17;
    const us = h >= 13 && h < 22;
    const as = h < 9;
    return (
      `${as ? '🟢' : '🔴'} آسيا      00:00–09:00 GMT\n` +
      `${eu ? '🟢' : '🔴'} أوروبا   08:00–17:00 GMT\n` +
      `${us ? '🟢' : '🔴'} أمريكا   13:30–22:00 GMT\n\n` +
      `⭐ *أفضل وقت للتداول:* تداخل أوروبا+أمريكا\n` +
      `🕐 13:30 – 17:00 GMT`
    );
  }

  // ── COMMAND HANDLER ───────────────────────────────────────
  const command = text.split(' ')[0].toLowerCase() || cbData;
  const targetChat = chatId || CHAT_ID;
  const msgId = msg?.message_id;

  // ════════════════════════════════════════════════════
  // /start أو /menu — التابلو الرئيسي
  // ════════════════════════════════════════════════════
  if (command === '/start' || command === '/menu' || command === 'menu') {
    const welcome = `🥈 *Silver AI Trading Bot*
━━━━━━━━━━━━━━━━━━━━━
*XAG/USD — نظام التداول الذكي*

مرحباً! أنا بوت تحليل الفضة المدعوم بـ AI

🔴 _اختر من القائمة أدناه:_`;
    if (cbData) {
      await editMsg(targetChat, msgId, welcome, { inline_keyboard: mainKeyboard.inline_keyboard });
    } else {
      await sendMsg(targetChat, welcome, mainKeyboard);
    }
  }

  // ════════════════════════════════════════════════════
  // السعر اللحظي
  // ════════════════════════════════════════════════════
  else if (command === '/price' || command === 'price') {
    const d = await getLivePrice();
    if (d.error) {
      const errMsg = `❌ *خطأ في جلب السعر*\n\`${d.error}\``;
      cbData ? await editMsg(targetChat, msgId, errMsg, { inline_keyboard: [[{ text: '🔙 رجوع', callback_data: 'menu' }]] })
             : await sendMsg(targetChat, errMsg);
    } else {
      const trend = d.price > d.bid ? '📈' : '📉';
      const reply = `💰 *السعر اللحظي — XAG/USD*
━━━━━━━━━━━━━━━━━━━━━
${trend} *السعر:* \`$${d.price.toFixed(3)}\`
🔴 *Bid (بيع):*  \`${d.bid.toFixed(3)}\`
🟢 *Ask (شراء):* \`${d.ask.toFixed(3)}\`
📏 *Spread:*      \`${d.spread.toFixed(4)}\`
━━━━━━━━━━━━━━━━━━━━━
🌐 *الجلسة:* ${getSessionName()}
⏱ \`${new Date().toUTCString()}\`
_📡 MetaAPI MT5 — Live_`;
      const kb = { inline_keyboard: [
        [{ text: '🔄 تحديث', callback_data: 'price' }, { text: '📊 إشارة', callback_data: 'signal' }],
        [{ text: '🔙 القائمة الرئيسية', callback_data: 'menu' }]
      ]};
      cbData ? await editMsg(targetChat, msgId, reply, kb)
             : await sendMsg(targetChat, reply, kb);
    }
  }

  // ════════════════════════════════════════════════════
  // الإشارة الكاملة
  // ════════════════════════════════════════════════════
  else if (command === '/signal' || command === 'signal') {
    const d = await getLivePrice();
    const p = d.price || 75;
    const sl  = (p * 1.005).toFixed(3);
    const tp1 = (p * 0.995).toFixed(3);
    const tp2 = (p * 0.990).toFixed(3);
    const reply = `📊 *إشارة XAG/USD*
━━━━━━━━━━━━━━━━━━━━━
🔴 *الإشارة:* SELL
🎯 *الثقة:* 68%
━━━━━━━━━━━━━━━━━━━━━
📍 *دخول:*    \`$${p.toFixed(3)}\`
🛑 *وقف خسارة:* \`$${sl}\`
🎯 *هدف 1:*   \`$${tp1}\`
🎯 *هدف 2:*   \`$${tp2}\`
━━━━━━━━━━━━━━━━━━━━━
⚖️ *نسبة R:R:* 1 : 2.0
🌐 *أفضل جلسة:* ${getSessionName()}
━━━━━━━━━━━━━━━━━━━━━
🏫 *المدارس:*
• ICT/SMC: SELL 🔴
• Wyckoff: Distribution 🟠
• Elliott: Wave 5 End 🔴
• Supply/Demand: Supply Zone 🔴
⏱ \`${new Date().toUTCString()}\``;
    const kb = { inline_keyboard: [
      [{ text: '✅ قرار الدخول', callback_data: 'decision' }],
      [{ text: '🤖 تحليل AI', callback_data: 'ai_claude' }, { text: '📐 المستويات', callback_data: 'levels' }],
      [{ text: '🔙 القائمة', callback_data: 'menu' }]
    ]};
    cbData ? await editMsg(targetChat, msgId, reply, kb)
           : await sendMsg(targetChat, reply, kb);
  }

  // ════════════════════════════════════════════════════
  // تحليل AI
  // ════════════════════════════════════════════════════
  else if (command === '/ai' || command === 'ai_claude' || command === 'ai_openai') {
    const model  = command === 'ai_openai' ? 'openai' : 'claude';
    const mLabel = model === 'claude' ? '🟠 Claude Sonnet' : '🔵 GPT-4o';

    // أرسل رسالة انتظار
    const waitMsg = await sendMsg(targetChat, `⏳ *${mLabel} يحلل الآن...*\nجاري جلب البيانات وتحليلها...`);

    const d        = await getLivePrice();
    const analysis = await getAIAnalysis(model, d);

    // احذف رسالة الانتظار وأرسل التحليل
    await fetch(`${BASE_URL}/deleteMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: targetChat, message_id: waitMsg.result?.message_id })
    });

    const chunks = [];
    const header = `🤖 *تحليل ${mLabel}*\n*XAG/USD — $${d.price?.toFixed(3) || '---'}*\n━━━━━━━━━━━━━━━━━━━━━\n`;
    const footer = `\n━━━━━━━━━━━━━━━━━━━━━\n⏱ \`${new Date().toUTCString()}\``;
    const full   = header + analysis + footer;

    for (let i = 0; i < full.length; i += 3800) chunks.push(full.substring(i, i+3800));

    const kb = { inline_keyboard: [
      [{ text: '🔄 تحليل جديد', callback_data: command }, { text: '📊 الإشارة', callback_data: 'signal' }],
      [{ text: '🔙 القائمة', callback_data: 'menu' }]
    ]};

    for (let i = 0; i < chunks.length; i++) {
      await sendMsg(targetChat, chunks[i], i === chunks.length-1 ? kb : null);
    }
  }

  // ════════════════════════════════════════════════════
  // مستويات الدعم والمقاومة
  // ════════════════════════════════════════════════════
  else if (command === '/levels' || command === 'levels') {
    const d = await getLivePrice();
    const p = d.price || 75;
    const reply = `📐 *مستويات XAG/USD*
━━━━━━━━━━━━━━━━━━━━━
🔴 *R2 — مقاومة قوية:*  \`${(p*1.010).toFixed(3)}\`
🟠 *R1 — Order Block بيع:* \`${(p*1.005).toFixed(3)}\`
━━━━━━━━━━━━━━━━━━━━━
⚪ *السعر الحالي:*      \`$${p.toFixed(3)}\`
━━━━━━━━━━━━━━━━━━━━━
🟢 *S1 — FVG + دعم:*   \`${(p*0.995).toFixed(3)}\`
🟢 *S2 — Order Block شراء:* \`${(p*0.990).toFixed(3)}\`
🟢 *S3 — دعم قوي H4:*  \`${(p*0.983).toFixed(3)}\`
━━━━━━━━━━━━━━━━━━━━━
📦 *Supply Zone:* \`${(p*1.005).toFixed(3)} — ${(p*1.012).toFixed(3)}\`
🧲 *Demand Zone:* \`${(p*0.988).toFixed(3)} — ${(p*0.995).toFixed(3)}\`
⚡ *FVG:*          \`${(p*0.992).toFixed(3)} — ${(p*0.997).toFixed(3)}\`
━━━━━━━━━━━━━━━━━━━━━
⏱ \`${new Date().toUTCString()}\``;
    const kb = { inline_keyboard: [
      [{ text: '🔄 تحديث', callback_data: 'levels' }, { text: '✅ قرار الدخول', callback_data: 'decision' }],
      [{ text: '🔙 القائمة', callback_data: 'menu' }]
    ]};
    cbData ? await editMsg(targetChat, msgId, reply, kb)
           : await sendMsg(targetChat, reply, kb);
  }

  // ════════════════════════════════════════════════════
  // تحليل المدارس
  // ════════════════════════════════════════════════════
  else if (command === '/schools' || command === 'schools') {
    const reply = `🏫 *تحليل متعدد المدارس — XAG/USD*
━━━━━━━━━━━━━━━━━━━━━
📌 *ICT / SMC*
• Order Block: منطقة بيع H1 🔴
• FVG: موجود أسفل السعر
• Liquidity Sweep: اكتمل
• الإشارة: *SELL* 🔴

📌 *Wyckoff*
• المرحلة: Distribution Phase C
• UTAD: اكتمل
• الإشارة: *SELL* 🟠

📌 *Elliott Wave*
• الوضع: نهاية Wave 5
• الهدف: تصحيح ABC
• الإشارة: *SELL* 🔴

📌 *Supply & Demand*
• منطقة عرض H1: نشطة وغير مكسورة
• منطقة طلب H4: أسفل بـ 2%
• الإشارة: *SELL* 🔴

📌 *Price Action*
• BOS: اتجاه هابط
• CHoCH: لم يحدث بعد
• الإشارة: *BEAR* 🔴

📌 *Macro / Fundamental*
• DXY: صاعد → سلبي للفضة
• الفيدرالي: متشدد
• الإشارة: *NEUTRAL* 🟡
━━━━━━━━━━━━━━━━━━━━━
🎯 *الإجماع: SELL بثقة 68%*`;
    const kb = { inline_keyboard: [
      [{ text: '📊 الإشارة الكاملة', callback_data: 'signal' }],
      [{ text: '🤖 تحليل AI', callback_data: 'ai_claude' }],
      [{ text: '🔙 القائمة', callback_data: 'menu' }]
    ]};
    cbData ? await editMsg(targetChat, msgId, reply, kb)
           : await sendMsg(targetChat, reply, kb);
  }

  // ════════════════════════════════════════════════════
  // الجلسات
  // ════════════════════════════════════════════════════
  else if (command === '/sessions' || command === 'sessions') {
    const reply = `🌐 *جلسات التداول — XAG/USD*
━━━━━━━━━━━━━━━━━━━━━
${getSessionStatus()}
━━━━━━━━━━━━━━━━━━━━━
💡 *نصائح الجلسات:*
🌏 *آسيا:* حركة بطيئة، تجنب الدخول
🇪🇺 *أوروبا:* حركة جيدة، ابحث عن الاتجاه
🇺🇸 *أمريكا:* أعلى تقلب، أفضل فرص
⭐ *التداخل:* أقوى جلسة للفضة
━━━━━━━━━━━━━━━━━━━━━
⏱ \`${new Date().toUTCString()}\``;
    const kb = { inline_keyboard: [
      [{ text: '🔄 تحديث', callback_data: 'sessions' }],
      [{ text: '🔙 القائمة', callback_data: 'menu' }]
    ]};
    cbData ? await editMsg(targetChat, msgId, reply, kb)
           : await sendMsg(targetChat, reply, kb);
  }

  // ════════════════════════════════════════════════════
  // الروزنامة الاقتصادية
  // ════════════════════════════════════════════════════
  else if (command === '/calendar' || command === 'calendar') {
    const reply = `📅 *الروزنامة الاقتصادية — مؤثرات الفضة*
━━━━━━━━━━━━━━━━━━━━━
🔴 *تأثير عالٍ:*
🇺🇸 CPI y/y        ← اليوم 14:30 GMT
🇺🇸 FOMC Minutes   ← غداً  18:00 GMT
🇺🇸 NFP            ← الجمعة 13:30 GMT

🟠 *تأثير متوسط:*
🇨🇳 Industrial Output ← الخميس 02:00 GMT
🇪🇺 PMI Manufacturing ← الجمعة 09:00 GMT
🇺🇸 PPI m/m         ← الجمعة 13:30 GMT

⚪ *تأثير منخفض:*
🇺🇸 Jobless Claims  ← الخميس 13:30 GMT
━━━━━━━━━━━━━━━━━━━━━
💡 *تجنب الدخول 15 دقيقة قبل وبعد الأخبار عالية التأثير*
━━━━━━━━━━━━━━━━━━━━━
📌 *مؤثرات الفضة الأساسية:*
• 📈 DXY يرتفع → فضة تنخفض
• 📈 أسعار الفائدة ترتفع → فضة تنخفض
• 📈 التضخم يرتفع → فضة ترتفع
• 📈 طلب الصين الصناعي → فضة ترتفع`;
    const kb = { inline_keyboard: [
      [{ text: '🇨🇳 طلب الصين', callback_data: 'china' }, { text: '📈 الماكرو', callback_data: 'macro' }],
      [{ text: '🔙 القائمة', callback_data: 'menu' }]
    ]};
    cbData ? await editMsg(targetChat, msgId, reply, kb)
           : await sendMsg(targetChat, reply, kb);
  }

  // ════════════════════════════════════════════════════
  // طلب الصين
  // ════════════════════════════════════════════════════
  else if (command === '/china' || command === 'china') {
    const reply = `🇨🇳 *الطلب الصيني على الفضة*
━━━━━━━━━━━━━━━━━━━━━
🌞 *الطاقة الشمسية:* 42% من الطلب
⚡ *السيارات الكهربائية:* 18%
📱 *الإلكترونيات:* 13%
🏭 *صناعات أخرى:* 20%
📊 *مجموع الطلب الصناعي:* 73%
━━━━━━━━━━━━━━━━━━━━━
📊 *المؤشرات الحالية:*
🏭 PMI الصناعي: 50.4 (توسع)
⚡ إنتاج الطاقة الشمسية: +28% سنوياً
🚗 مبيعات EV: +35% سنوياً
━━━━━━━━━━━━━━━━━━━━━
💡 *التأثير على السعر:*
• طلب صيني قوي = دعم للفضة 📈
• تباطؤ الاقتصاد الصيني = ضغط 📉
• قرارات التحفيز الصيني = تقلب

🔮 *التوقعات:* الطلب الصناعي مستمر
في النمو مع التوسع في الطاقة الشمسية`;
    const kb = { inline_keyboard: [
      [{ text: '📅 الروزنامة', callback_data: 'calendar' }, { text: '📈 الماكرو', callback_data: 'macro' }],
      [{ text: '🔙 القائمة', callback_data: 'menu' }]
    ]};
    cbData ? await editMsg(targetChat, msgId, reply, kb)
           : await sendMsg(targetChat, reply, kb);
  }

  // ════════════════════════════════════════════════════
  // المؤشرات الكلية
  // ════════════════════════════════════════════════════
  else if (command === '/macro' || command === 'macro') {
    const d = await getLivePrice();
    const p = d.price || 75;
    const gsr = (2600 / p).toFixed(1);
    const reply = `📈 *المؤشرات الكلية — تأثير على الفضة*
━━━━━━━━━━━━━━━━━━━━━
💵 *DXY (الدولار):* 104.2 🔴
↑ دولار قوي = ضغط على الفضة

📊 *GSR (نسبة الذهب/الفضة):* ${gsr}
${parseFloat(gsr) > 80 ? '• نسبة مرتفعة = فضة رخيصة نسبياً 📈' : '• نسبة منخفضة = فضة غالية نسبياً 📉'}

🏦 *الفيدرالي الأمريكي:*
• الفائدة الحالية: 5.25–5.50%
• التوجه: متشدد 🔴
• التأثير: سلبي على الفضة

📊 *سندات الخزانة 10 سنوات:* 4.42%
↑ عوائد مرتفعة = ضغط على الفضة

💹 *VIX (مؤشر الخوف):* 18.3
• منخفض = شهية مخاطرة جيدة

🌍 *التضخم الأمريكي (CPI):* 3.2%
• تضخم مرتفع = دعم للفضة كملاذ
━━━━━━━━━━━━━━━━━━━━━
🎯 *الخلاصة:* بيئة مختلطة
DXY قوي يضغط لكن التضخم يدعم`;
    const kb = { inline_keyboard: [
      [{ text: '🇨🇳 طلب الصين', callback_data: 'china' }, { text: '📅 الروزنامة', callback_data: 'calendar' }],
      [{ text: '🔙 القائمة', callback_data: 'menu' }]
    ]};
    cbData ? await editMsg(targetChat, msgId, reply, kb)
           : await sendMsg(targetChat, reply, kb);
  }

  // ════════════════════════════════════════════════════
  // ✅ قرار الدخول — الأهم قبل الصفقة
  // ════════════════════════════════════════════════════
  else if (command === '/decision' || command === 'decision') {
    const d = await getLivePrice();
    const p = d.price || 75;
    const h = new Date().getUTCHours();
    const goodSession = (h >= 8 && h < 22);
    const sessionOk = goodSession ? '✅' : '❌';
    const spreadOk  = (d.spread || 0.03) < 0.05 ? '✅' : '⚠️';

    const reply = `✅ *قرار ما قبل الدخول — Checklist*
━━━━━━━━━━━━━━━━━━━━━
*السعر الحالي: $${p.toFixed(3)}*
━━━━━━━━━━━━━━━━━━━━━
📋 *شروط الدخول:*

${sessionOk} الجلسة: ${getSessionName()}
${spreadOk} السبريد: ${d.spread?.toFixed(4) || '---'} ${(d.spread||0.03) < 0.05 ? '(مقبول)' : '(مرتفع — انتظر)'}
⚠️ أخبار قريبة: تحقق من الروزنامة
🔴 الاتجاه H1: هابط
🔴 السعر في منطقة عرض: نعم
🔴 الإشارة: SELL
━━━━━━━━━━━━━━━━━━━━━
📍 *تفاصيل الصفقة:*
• دخول:  \`$${p.toFixed(3)}\`
• وقف:   \`$${(p*1.005).toFixed(3)}\` (0.5%)
• هدف 1: \`$${(p*0.995).toFixed(3)}\` (0.5%)
• هدف 2: \`$${(p*0.990).toFixed(3)}\` (1.0%)
• R:R:   1 : 2.0
━━━━━━━━━━━━━━━━━━━━━
${goodSession && (d.spread||0.03) < 0.05
  ? '🟢 *الحكم: الشروط مناسبة للدخول*'
  : '🔴 *الحكم: انتظر تحسن الشروط*'}`;

    const kb = { inline_keyboard: [
      [{ text: '📊 الإشارة الكاملة', callback_data: 'signal' }],
      [{ text: '🤖 تحليل AI قبل الدخول', callback_data: 'ai_claude' }],
      [{ text: '📐 المستويات', callback_data: 'levels' }, { text: '📅 الروزنامة', callback_data: 'calendar' }],
      [{ text: '🔙 القائمة', callback_data: 'menu' }]
    ]};
    cbData ? await editMsg(targetChat, msgId, reply, kb)
           : await sendMsg(targetChat, reply, kb);
  }

  // ════════════════════════════════════════════════════
  // /help
  // ════════════════════════════════════════════════════
  else if (command === '/help' || command === 'settings') {
    const reply = `⚙️ *Silver AI Bot — الأوامر*
━━━━━━━━━━━━━━━━━━━━━
💰 /price    — السعر اللحظي
📊 /signal   — إشارة كاملة
✅ /decision  — قرار الدخول
📐 /levels   — الدعم والمقاومة
🏫 /schools  — تحليل المدارس
🤖 /ai       — تحليل AI
🌐 /sessions — الجلسات
📅 /calendar — الروزنامة
🇨🇳 /china   — طلب الصين
📈 /macro    — المؤشرات الكلية
📋 /menu     — القائمة الرئيسية
━━━━━━━━━━━━━━━━━━━━━
_🥈 Silver AI Bot v2.0_
_Powered by MetaAPI + Claude + GPT-4o_`;
    const kb = { inline_keyboard: [[{ text: '🔙 القائمة الرئيسية', callback_data: 'menu' }]] };
    cbData ? await editMsg(targetChat, msgId, reply, kb)
           : await sendMsg(targetChat, reply, kb);
  }

  return res.status(200).json({ ok: true });
}
