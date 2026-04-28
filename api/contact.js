const HITS = new Map();
const RATE_LIMIT = 5;
const RATE_WINDOW = 60_000;

const getIp = req => (req.headers['x-forwarded-for'] || req.socket?.remoteAddress || 'unknown')
  .toString().split(',')[0].trim();

const allow = ip => {
  const now = Date.now();
  const arr = (HITS.get(ip) || []).filter(t => now - t < RATE_WINDOW);
  if (arr.length >= RATE_LIMIT) return false;
  arr.push(now);
  HITS.set(ip, arr);
  if (HITS.size > 500) {
    for (const [k, v] of HITS) if (!v.length || now - v[v.length - 1] > RATE_WINDOW) HITS.delete(k);
  }
  return true;
};

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'method not allowed' });
    return;
  }

  if (!allow(getIp(req))) {
    res.status(429).json({ error: 'too many requests' });
    return;
  }

  const { name, contact, services, brief } = req.body || {};
  if (!contact || typeof contact !== 'string' || !contact.trim()) {
    res.status(400).json({ error: 'contact required' });
    return;
  }

  const safeName = (name || '').toString().slice(0, 80).trim() || '—';
  const safeContact = contact.toString().slice(0, 120).trim();
  const safeServices = Array.isArray(services) ? services.filter(s => typeof s === 'string').slice(0, 8).join(', ') : '—';
  const safeBrief = (brief || '').toString().slice(0, 2000).trim() || '—';

  const text =
    `Новая заявка с aqualang.pro\n\n` +
    `Имя: ${safeName}\n` +
    `Контакт: ${safeContact}\n` +
    `Услуги: ${safeServices || '—'}\n\n` +
    `Задача:\n${safeBrief}`;

  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;

  if (!token || !chatId) {
    console.log('[contact stub]', text);
    res.status(200).json({ ok: true, stub: true });
    return;
  }

  try {
    const r = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, text })
    });
    if (!r.ok) {
      const txt = await r.text();
      console.error('telegram', r.status, txt);
      res.status(502).json({ error: 'telegram failed' });
      return;
    }
    res.status(200).json({ ok: true });
  } catch (e) {
    console.error('contact err', e);
    res.status(500).json({ error: 'server error' });
  }
}
