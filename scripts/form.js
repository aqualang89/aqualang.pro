(() => {
  const form = document.getElementById('briefForm');
  if (!form) return;
  const status = form.querySelector('.form-status');
  const submit = form.querySelector('.submit');
  const submitTxt = submit.querySelector('span:first-child');
  const arr = submit.querySelector('.arr');
  const origText = submitTxt.textContent;
  const origArr = arr.textContent;

  document.querySelectorAll('#pills .pill').forEach(p => {
    p.addEventListener('click', () => p.classList.toggle('on'));
  });

  const setStatus = (msg, kind) => {
    if (!status) return;
    status.textContent = msg || '';
    status.classList.remove('ok', 'err');
    if (kind) status.classList.add(kind);
  };

  form.addEventListener('submit', async e => {
    e.preventDefault();
    if (submit.disabled) return;

    const name = form.querySelector('[name=name]').value.trim();
    const contact = form.querySelector('[name=contact]').value.trim();
    const brief = form.querySelector('[name=brief]').value.trim();
    const consent = form.querySelector('[name=consent]').checked;
    const services = [...form.querySelectorAll('#pills .pill.on')].map(p => p.textContent.trim());

    if (!contact) {
      setStatus('укажи телеграм или e-mail', 'err');
      return;
    }
    if (!consent) {
      setStatus('поставь галочку согласия с политикой', 'err');
      return;
    }

    submit.disabled = true;
    setStatus('отправляю…');

    try {
      const r = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, contact, services, brief })
      });
      if (!r.ok) throw new Error('http ' + r.status);
      submitTxt.textContent = 'Отправлено';
      arr.textContent = '✓';
      setStatus('заявка ушла, отвечу за пару часов', 'ok');
      form.reset();
      document.querySelectorAll('#pills .pill').forEach((p, i) => p.classList.toggle('on', i === 0));
      setTimeout(() => {
        submitTxt.textContent = origText;
        arr.textContent = origArr;
        submit.disabled = false;
        setStatus('');
      }, 5000);
    } catch (_) {
      setStatus('что-то сломалось, напиши в Telegram', 'err');
      submit.disabled = false;
    }
  });
})();
