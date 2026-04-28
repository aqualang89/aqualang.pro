(() => {
  const fab = document.getElementById('chatFab');
  const overlay = document.getElementById('chatOverlay');
  const closeBtn = document.getElementById('chatClose');
  const body = document.getElementById('chatBody');
  const input = document.getElementById('chatInput');
  const send = document.getElementById('chatSend');
  if (!fab || !overlay || !body || !input || !send) return;

  const history = [];
  let busy = false;

  const isEn = () => (document.documentElement.lang || 'ru') === 'en';
  const tx = (ru, en) => isEn() ? en : ru;

  const greet = () => {
    if (body.children.length) return;
    addMsg('bot', tx(
      'Привет! Я ИИ-ассистент Макса. Спроси про услуги, цены, сроки или как идёт работа.',
      'Hi! I am Max\'s AI assistant. Ask about services, pricing, timelines or how the work goes.'
    ));
  };

  const addMsg = (role, text) => {
    const el = document.createElement('div');
    el.className = 'msg ' + role;
    el.textContent = text;
    body.appendChild(el);
    body.scrollTop = body.scrollHeight;
    return el;
  };

  const open = () => {
    overlay.classList.add('open');
    greet();
    setTimeout(() => input.focus(), 200);
  };
  const close = () => overlay.classList.remove('open');

  fab.addEventListener('click', open);
  closeBtn.addEventListener('click', close);
  overlay.addEventListener('click', e => { if (e.target === overlay) close(); });
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && overlay.classList.contains('open')) close(); });

  const autosize = () => {
    input.style.height = 'auto';
    input.style.height = Math.min(input.scrollHeight, 120) + 'px';
  };
  input.addEventListener('input', autosize);

  const submit = async () => {
    const text = input.value.trim();
    if (!text || busy) return;
    busy = true;
    send.disabled = true;
    addMsg('user', text);
    history.push({ role: 'user', content: text });
    input.value = '';
    autosize();

    const typing = addMsg('bot', '…');
    typing.classList.add('typing');

    try {
      const r = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: history })
      });
      const data = await r.json().catch(() => ({}));
      typing.remove();
      if (!r.ok) {
        const msg = r.status === 429
          ? tx('Слишком часто. Подожди минуту и попробуй снова.', 'Too many requests. Wait a minute and try again.')
          : tx('Что-то пошло не так. Попробуй позже или напиши в Telegram.', 'Something went wrong. Try later or DM on Telegram.');
        addMsg('bot', msg);
      } else {
        const reply = data.reply || tx('Пустой ответ.', 'Empty response.');
        addMsg('bot', reply);
        history.push({ role: 'assistant', content: reply });
      }
    } catch (_) {
      typing.remove();
      addMsg('bot', tx('Нет связи с сервером. Проверь интернет или напиши в Telegram.', 'No server connection. Check your internet or DM on Telegram.'));
    } finally {
      busy = false;
      send.disabled = false;
      input.focus();
    }
  };

  send.addEventListener('click', submit);
  input.addEventListener('keydown', e => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      submit();
    }
  });
})();
