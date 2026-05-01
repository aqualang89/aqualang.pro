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

    const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
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
    const step = 5;
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
    const updScroll = () => {
      const sy = window.scrollY || document.documentElement.scrollTop;
      scrollDispersion = Math.min(sy / (ch * 0.9), 1);
    };
    window.addEventListener('scroll', updScroll, { passive: true });
    updScroll();

    const t0 = performance.now();
    let frame = 0;

    function animate() {
      requestAnimationFrame(animate);
      if (!visible) return;
      frame++;
      if (frame % 2 !== 0) return;

      const t = (performance.now() - t0) / 1000;
      formProgress = Math.min(formProgress + 0.018, 1);
      const blend = formProgress * (1 - scrollDispersion);

      ctx.clearRect(0, 0, cv.width, cv.height);
      const cx = cv.width / 2;
      const cy = cv.height / 2;

      const scale = (cw / W) * 0.92 * dpr;
      const dotSize = Math.max(1.2, 1.4 * dpr);

      for (let i = 0; i < N; i++) {
        const seed = seeds[i];
        const tx = pts[i][0] * scale + Math.sin(t * 1.1 + seed * 9) * 1.2 * dpr;
        const ty = pts[i][1] * scale + Math.cos(t * 0.9 + seed * 7) * 1.2 * dpr;
        const rx = randoms[i * 2] * dpr;
        const ry = randoms[i * 2 + 1] * dpr;

        const x = tx * blend + rx * (1 - blend);
        const y = ty * blend + ry * (1 - blend);

        const a = 0.45 + seed * 0.4;
        ctx.fillStyle = `rgba(126,232,211,${a})`;
        ctx.fillRect(cx + x, cy + y, dotSize, dotSize);
      }
    }
    animate();
  }
})();
