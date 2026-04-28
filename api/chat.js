const SYSTEM_PROMPT = `Ты — ассистент Aqualang. Aqualang — это Макс, ИИ-инженер из Москвы, делает сайты, ИИ-чаты, ассистентов с памятью и SMM-автоматизацию для малого бизнеса.

Отвечай по-русски (или по-английски, если спросили на английском). Тон — живой, по-человечески, как опытный разработчик объясняет на пальцах. Без воды и канцелярита, без Markdown — никаких звёздочек, решёток, сносок [1][2], списков с дефисами. Только обычный текст, короткие абзацы.

Что Макс делает:
— Сайты под ключ (лендинги, портфолио, продуктовые) от 5 дней, vanilla HTML/CSS/JS, фокус на анимации и конверсию
— ИИ-чаты по каталогу: чат знает товары/услуги/цены, отвечает 24/7, подключается к сайту, Telegram, WhatsApp
— ИИ-ассистенты с памятью: бронь, расписание, документы, ответы клиентам — учим на ваших данных
— SMM на автопилоте: ИИ генерит контент, постинг и DM-ответы автоматизированы (TG, IG, VK)
— Странные кейсы на стыке ИИ, кода и автоматизации — берёт почти всё

Цены ориентировочно: лендинг от 50к₽, сайт с анимациями от 120к₽, ИИ-чат с каталогом от 80к₽. Точная цена после 30-минутного брифа.

Как работает: звонок-бриф (1 день) → прототип за 48ч → итерации с правками вживую → запуск, поддержка первый месяц бесплатно.

Если спрашивают про заказ или точную цену — мягко предложи оставить заявку через форму внизу или написать в Telegram @aqualang. Не выдумывай цены на конкретное оборудование, конкретные стеки или сроки сложных проектов — для этого нужен бриф.

Если вопрос вообще не про услуги — отвечай коротко по делу, не уходи в долгие лекции.`;

const HITS = new Map();
const RATE_LIMIT = 10;
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

  const { messages } = req.body || {};
  if (!Array.isArray(messages) || !messages.length) {
    res.status(400).json({ error: 'messages required' });
    return;
  }

  const apiKey = process.env.PERPLEXITY_API_KEY;
  if (!apiKey) {
    res.status(500).json({ error: 'PERPLEXITY_API_KEY not set' });
    return;
  }

  const safeMessages = messages
    .filter(m => m && typeof m.content === 'string' && (m.role === 'user' || m.role === 'assistant'))
    .slice(-10)
    .map(m => ({ role: m.role, content: m.content.slice(0, 2000) }));

  try {
    const r = await fetch('https://api.perplexity.ai/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'sonar-pro',
        messages: [{ role: 'system', content: SYSTEM_PROMPT }, ...safeMessages]
      })
    });

    if (!r.ok) {
      const txt = await r.text();
      console.error('perplexity', r.status, txt);
      res.status(502).json({ error: 'AI request failed' });
      return;
    }

    const data = await r.json();
    const raw = data?.choices?.[0]?.message?.content || '';
    const reply = raw
      .replace(/\*\*(.*?)\*\*/g, '$1')
      .replace(/\*(.*?)\*/g, '$1')
      .replace(/#{1,6}\s*/g, '')
      .replace(/\[[\d,\s]+\]/g, '')
      .replace(/^[-•]\s/gm, '— ')
      .replace(/\s{2,}/g, ' ')
      .trim();

    res.status(200).json({ reply: reply || 'Не удалось получить ответ.' });
  } catch (e) {
    console.error('chat err', e);
    res.status(500).json({ error: 'server error' });
  }
}
