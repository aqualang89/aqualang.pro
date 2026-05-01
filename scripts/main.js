(() => {
  const isMobile = window.matchMedia('(max-width: 880px)').matches;
  const initLenis = () => {
    if (isMobile) return;
    if (!window.Lenis) { setTimeout(initLenis, 60); return; }
    const lenis = new Lenis({ lerp: 0.08, smoothWheel: true });
    const raf = t => { lenis.raf(t); requestAnimationFrame(raf); };
    requestAnimationFrame(raf);
    document.querySelectorAll('a[href^="#"]').forEach(a => {
      a.addEventListener('click', e => {
        const id = a.getAttribute('href');
        if (id.length > 1) {
          const tgt = document.querySelector(id);
          if (tgt) { e.preventDefault(); lenis.scrollTo(tgt, { offset: 0, duration: 1.4 }); }
        }
      });
    });
    window.__lenis = lenis;
  };
  initLenis();

  const langButtons = document.querySelectorAll('#lang button');
  const apply = lang => {
    document.documentElement.lang = lang;
    document.querySelectorAll('[data-ru]').forEach(el => {
      const v = el.getAttribute('data-' + lang);
      if (v != null) el.innerHTML = v;
    });
    langButtons.forEach(b => b.classList.toggle('on', b.dataset.l === lang));
    try { localStorage.setItem('aql_lang', lang); } catch (_) {}
  };
  langButtons.forEach(b => b.addEventListener('click', () => apply(b.dataset.l)));
  let saved = 'ru';
  try { saved = localStorage.getItem('aql_lang') || 'ru'; } catch (_) {}
  if (saved === 'en') apply('en');

  const io = new IntersectionObserver(entries => {
    entries.forEach(e => { if (e.isIntersecting) e.target.classList.add('in'); });
  }, { threshold: .12 });
  document.querySelectorAll('.mask-line, .fade, .by-letter').forEach(el => io.observe(el));
  setTimeout(() => {
    document.querySelectorAll('.hero .mask-line, .hero .fade').forEach(el => el.classList.add('in'));
  }, 80);

  const cur = document.getElementById('cur');
  const lab = document.getElementById('curLabel');
  if (cur && lab && window.matchMedia('(min-width: 881px)').matches) {
    let tx = 0, ty = 0, cx = 0, cy = 0;
    document.addEventListener('mousemove', e => { tx = e.clientX; ty = e.clientY; });
    const tick = () => {
      cx += (tx - cx) * .18; cy += (ty - cy) * .18;
      cur.style.transform = `translate(${cx}px,${cy}px) translate(-50%,-50%)`;
      lab.style.transform = `translate(${cx}px,${cy}px) translate(-50%,-50%)`;
      requestAnimationFrame(tick);
    };
    tick();
    document.querySelectorAll('a,button,.s-card,.pill,input,textarea,.q').forEach(el => {
      el.addEventListener('mouseenter', () => {
        cur.classList.add('big');
        const h = el.getAttribute('data-hover');
        if (h) { lab.textContent = h; lab.classList.add('show'); }
      });
      el.addEventListener('mouseleave', () => {
        cur.classList.remove('big');
        lab.classList.remove('show');
      });
    });
  }

  document.querySelectorAll('[data-magnetic]').forEach(el => {
    el.addEventListener('mousemove', e => {
      const r = el.getBoundingClientRect();
      const px = (e.clientX - r.left - r.width / 2) / r.width;
      const py = (e.clientY - r.top - r.height / 2) / r.height;
      el.style.transform = `translate(${px * 18}px,${py * 18}px)`;
    });
    el.addEventListener('mouseleave', () => {
      el.style.transition = 'transform .5s cubic-bezier(.2,.7,.1,1)';
      el.style.transform = '';
      setTimeout(() => el.style.transition = '', 500);
    });
    el.addEventListener('mouseenter', () => { el.style.transition = 'transform .15s ease-out'; });
  });

  document.querySelectorAll('[data-tilt]').forEach(el => {
    const glow = el.querySelector('.glow');
    el.addEventListener('mousemove', e => {
      const r = el.getBoundingClientRect();
      const px = (e.clientX - r.left) / r.width;
      const py = (e.clientY - r.top) / r.height;
      const rx = (py - .5) * -8;
      const ry = (px - .5) * 8;
      el.style.transform = `perspective(1200px) rotateX(${rx}deg) rotateY(${ry}deg) translateZ(0)`;
      if (glow) {
        glow.style.left = (e.clientX - r.left - 150) + 'px';
        glow.style.top = (e.clientY - r.top - 150) + 'px';
      }
    });
    el.addEventListener('mouseleave', () => {
      el.style.transition = 'transform .6s cubic-bezier(.2,.7,.1,1)';
      el.style.transform = '';
      setTimeout(() => el.style.transition = '', 600);
    });
    el.addEventListener('mouseenter', () => { el.style.transition = ''; });
  });

  document.querySelectorAll('#faqList .q').forEach(q => {
    q.addEventListener('click', () => q.classList.toggle('open'));
  });

  const hScroll = document.getElementById('hscroll');
  const hTrack = document.getElementById('htrack');
  if (hScroll && hTrack) {
    const setHScroll = () => {
      const trackW = hTrack.scrollWidth;
      const distance = trackW - window.innerWidth + 64;
      hScroll.style.height = (window.innerHeight + Math.max(distance, 0)) + 'px';
      hScroll.dataset.distance = Math.max(distance, 0);
    };
    setHScroll();
    let resizeT;
    window.addEventListener('resize', () => {
      clearTimeout(resizeT);
      resizeT = setTimeout(setHScroll, 120);
    });
    const onScroll = () => {
      const r = hScroll.getBoundingClientRect();
      const distance = +hScroll.dataset.distance || 0;
      if (r.top <= 0 && r.bottom >= window.innerHeight) {
        const progress = Math.min(Math.max(-r.top / (hScroll.offsetHeight - window.innerHeight), 0), 1);
        hTrack.style.transform = `translateX(${-progress * distance}px)`;
      }
    };
    if (window.__lenis) window.__lenis.on('scroll', onScroll); else window.addEventListener('scroll', onScroll, { passive: true });
  }

  const fmt = () => {
    const d = new Date();
    const h = String((d.getUTCHours() + 3) % 24).padStart(2, '0');
    const m = String(d.getMinutes()).padStart(2, '0');
    const s = String(d.getSeconds()).padStart(2, '0');
    return `${h}:${m}:${s}`;
  };
  const liveTime = document.getElementById('liveTime');
  const clock2 = document.getElementById('clock2');
  const updClocks = () => {
    const v = fmt();
    if (liveTime) liveTime.textContent = v;
    if (clock2) clock2.textContent = v;
  };
  updClocks();
  setInterval(updClocks, 1000);
})();
