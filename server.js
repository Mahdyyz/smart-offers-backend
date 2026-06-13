/**
 * Smart Offers - Backend (Node.js + Express)
 * استضف هذا على Vercel أو Railway مجاناً
 */

const express = require('express');
const cors = require('cors');
const { createClient } = require('@supabase/supabase-js');

const app = express();
app.use(cors());
app.use(express.json());

// ─── اتصال Supabase ─────────────────────────────────────────────────────────
// ضع هذه القيم في ملف .env
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

// ─── GET /api/config/:storeId ────────────────────────────────────────────────
// يُرجع إعدادات المتجر (يستدعيها الـ script في المتجر)
app.get('/api/config/:storeId', async (req, res) => {
  const { storeId } = req.params;

  const { data, error } = await supabase
    .from('stores')
    .select('config')
    .eq('store_id', storeId)
    .single();

  if (error || !data) {
    // إعدادات افتراضية إذا لم يُعثر على المتجر
    return res.json({
      discount: 10,
      message: 'لا تفوّت الفرصة! خذ خصمك الآن',
      couponCode: 'WELCOME10',
      triggerDelay: 30,
      exitIntent: true,
      showOnce: true,
    });
  }

  res.json(data.config);
});

// ─── POST /api/config/:storeId ───────────────────────────────────────────────
// يحفظ إعدادات المتجر (يُستدعى من لوحة التحكم)
app.post('/api/config/:storeId', async (req, res) => {
  const { storeId } = req.params;
  const config = req.body;

  const { error } = await supabase
    .from('stores')
    .upsert({ store_id: storeId, config, updated_at: new Date() });

  if (error) return res.status(500).json({ error: error.message });
  res.json({ success: true });
});

// ─── POST /api/track ─────────────────────────────────────────────────────────
// يسجّل أحداث العملاء (offer_shown, coupon_copied, etc.)
app.post('/api/track', async (req, res) => {
  const { storeId, event, ts } = req.body;

  await supabase.from('events').insert({
    store_id: storeId,
    event,
    created_at: new Date(ts),
  });

  res.json({ ok: true });
});

// ─── GET /api/stats/:storeId ─────────────────────────────────────────────────
// إحصائيات للوحة التحكم
app.get('/api/stats/:storeId', async (req, res) => {
  const { storeId } = req.params;

  const { data } = await supabase
    .from('events')
    .select('event')
    .eq('store_id', storeId);

  const stats = (data || []).reduce((acc, row) => {
    acc[row.event] = (acc[row.event] || 0) + 1;
    return acc;
  }, {});

  res.json(stats);
});

// ─── تشغيل السيرفر ───────────────────────────────────────────────────────────
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`✅ Server running on port ${PORT}`));

module.exports = app;
