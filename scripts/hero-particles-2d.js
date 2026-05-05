(() => {
  const cv = document.getElementById('threeCanvas');
  if (!cv) return;

  const start = async () => {
    if (document.fonts && document.fonts.ready) {
      try { await document.fonts.ready; } catch (_) {}
    }
    init();
  };

  if ('requestIdleCallback' in window) {
    requestIdleCallback(start, { timeout: 2000 });
  } else {
    setTimeout(start, 200);
  }

  function init() {
    const ctx = cv.getContext('2d');
    if (!ctx) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    let cw = 0, ch = 0;
    function resize() {
      cw = cv.clientWidth;
      ch = cv.clientHeight;
      cv.width = cw * dpr;
      cv.height = ch * dpr;
    }
    resize();

    const off = document.createElement('canvas');
    const W = 1400, H = 360;
    off.width = W; off.height = H;
    const g = off.getContext('2d');
    g.fillStyle = '#fff';
    g.font = '400 italic 240px "Lora", "Times New Roman", serif';
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.fillText('aqualang', W / 2, H / 2);

    const data = g.getImageData(0, 0, W, H).data;
    const pts = [];
    const step = 4;
    for (let y = 0; y < H; y += step) {
      for (let x = 0; x < W; x += step) {
        if (data[(y * W + x) * 4 + 3] > 128) {
          pts.push([x - W / 2, y - H / 2]);
        }
      }
    }
    if (!pts.length) return;
    const N = pts.length;

    const randoms = new Float32Array(N * 2);
    const seeds = new Float32Array(N);
    for (let i = 0; i < N; i++) {
      randoms[i * 2] = (Math.random() - 0.5) * Math.max(cw, 600) * 1.6;
      randoms[i * 2 + 1] = (Math.random() - 0.5) * Math.max(ch, 400) * 1.2;
      seeds[i] = Math.random();
    }

    let visible = true;
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(es => { visible = es[0].isIntersecting; }, { threshold: 0.01 }).observe(cv);
    }

    let resizeT;
    window.addEventListener('resize', () => { clearTimeout(resizeT); resizeT = setTimeout(resize, 120); });

    let formProgress = 0;
    let scrollDispersion = 0;
    let burst = 0;
    const updScroll = () => {
      const sy = window.scrollY || document.documentElement.scrollTop;
      scrollDispersion = Math.min(sy / (ch * 0.9), 1);
    };
    window.addEventListener('scroll', updScroll, { passive: true });
    updScroll();

    // Touch burst
    const heroEl = cv.closest('.hero') || cv.parentElement;
    if (heroEl) {
      heroEl.addEventListener('touchstart', (e) => {
        if (e.target.closest('a, button')) return;
        burst = 1.0;
      }, { passive: true });
    }

    const t0 = performance.now();

    function animate() {
      requestAnimationFrame(animate);
      if (!visible) return;

      const t = (performance.now() - t0) / 1000;
      formProgress = Math.min(formProgress + 0.018, 1);
      const blend = formProgress * (1 - scrollDispersion);

      ctx.clearRect(0, 0, cv.width, cv.height);
      const cx = cv.width / 2;
      const liftY = ch * 0.14 * dpr;
      const cy = cv.height / 2 - liftY;

      const scale = (cw / W) * 0.92 * dpr;
      const dotSize = Math.max(1.5, 1.8 * dpr);
      const burstStrength = burst;

      for (let i = 0; i < N; i++) {
        const seed = seeds[i];
        const tx = pts[i][0] * scale + Math.sin(t * 1.1 + seed * 9) * 1.5 * dpr;
        const ty = pts[i][1] * scale + Math.cos(t * 0.9 + seed * 7) * 1.5 * dpr;
        const rx = randoms[i * 2] * dpr;
        const ry = randoms[i * 2 + 1] * dpr;

        let x = tx * blend + rx * (1 - blend);
        let y = ty * blend + ry * (1 - blend);

        if (burstStrength > 0.01) {
          const bd = Math.hypot(x, y) + 0.001;
          const ang = seed * 6.28;
          x += (x / bd + Math.cos(ang) * 0.3) * burstStrength * 2.5;
          y += (y / bd + Math.sin(ang) * 0.3) * burstStrength * 2.5;
        }

        const a = 0.5 + seed * 0.45;
        ctx.fillStyle = `rgba(126,232,211,${a})`;
        ctx.fillRect(cx + x, cy + y, dotSize, dotSize);
      }

      burst *= 0.92;
    }
    animate();
  }
})();
