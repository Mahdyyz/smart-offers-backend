const express = require('express');
const cors = require('cors');
const { createClient } = require('@supabase/supabase-js');

const app = express();
app.use(cors());
app.use(express.json());

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

app.get('/', (req, res) => res.json({ status: 'ok', app: 'Smart Offers' }));

app.get('/api/config/:storeId', async (req, res) => {
  const { storeId } = req.params;
  const { data, error } = await supabase
    .from('stores').select('config').eq('store_id', storeId).single();
  if (error || !data) {
    return res.json({ discount: 10, message: 'لا تفوّت الفرصة!', couponCode: 'WELCOME10', triggerDelay: 30, exitIntent: true, showOnce: true });
  }
  res.json(data.config);
});

app.post('/api/config/:storeId', async (req, res) => {
  const { storeId } = req.params;
  const { error } = await supabase.from('stores')
    .upsert({ store_id: storeId, config: req.body, updated_at: new Date() });
  if (error) return res.status(500).json({ error: error.message });
  res.json({ success: true });
});

app.post('/api/track', async (req, res) => {
  const { storeId, event, ts } = req.body;
  await supabase.from('events').insert({ store_id: storeId, event, created_at: new Date(ts) });
  res.json({ ok: true });
});

app.get('/api/stats/:storeId', async (req, res) => {
  const { storeId } = req.params;
  const { data } = await supabase.from('events').select('event').eq('store_id', storeId);
  const stats = (data || []).reduce((acc, row) => {
    acc[row.event] = (acc[row.event] || 0) + 1;
    return acc;
  }, {});
  res.json(stats);
});

module.exports = app;
