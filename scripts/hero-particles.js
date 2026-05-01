(() => {
  const cv = document.getElementById('threeCanvas');
  if (!cv) return;

  const start = async () => {
    if (!window.THREE) {
      setTimeout(start, 80);
      return;
    }
    if (document.fonts && document.fonts.ready) {
      try { await document.fonts.ready; } catch (_) {}
    }
    init();
  };

  if ('requestIdleCallback' in window) {
    requestIdleCallback(start, { timeout: 2000 });
  } else {
    setTimeout(start, 220);
  }

  function sampleText(text) {
    const c = document.createElement('canvas');
    const w = c.width = 1400;
    const h = c.height = 360;
    const ctx = c.getContext('2d');
    ctx.fillStyle = '#fff';
    ctx.font = '300 italic 240px "Fraunces", "Times New Roman", serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, w / 2, h / 2);
    const data = ctx.getImageData(0, 0, w, h).data;
    const isMobile = window.matchMedia('(max-width: 880px)').matches;
    const step = isMobile ? 5 : 3;
    const pts = [];
    const sx = 0.012;
    for (let y = 0; y < h; y += step) {
      for (let x = 0; x < w; x += step) {
        if (data[(y * w + x) * 4 + 3] > 128) {
          pts.push([(x - w / 2) * sx, -(y - h / 2) * sx, 0]);
        }
      }
    }
    return pts;
  }

  function init() {
    const isMobile = window.matchMedia('(max-width: 880px)').matches;
    const targets = sampleText('aqualang');
    if (!targets.length) return;
    const N = targets.length;

    const renderer = new THREE.WebGLRenderer({ canvas: cv, antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, isMobile ? 1.2 : 1.6));
    renderer.setSize(cv.clientWidth, cv.clientHeight, false);
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(36, cv.clientWidth / cv.clientHeight, 0.1, 100);
    camera.position.z = 11;

    let minX = Infinity, maxX = -Infinity;
    for (let i = 0; i < targets.length; i++) {
      if (targets[i][0] < minX) minX = targets[i][0];
      if (targets[i][0] > maxX) maxX = targets[i][0];
    }
    const textWidth = maxX - minX;
    const verticalHalf = camera.position.z * Math.tan((camera.fov / 2) * Math.PI / 180);
    const horizontalHalf = verticalHalf * camera.aspect;
    const targetWidth = horizontalHalf * 2 * (isMobile ? 0.85 : 0.65);
    const fitScale = targetWidth / textWidth;
    for (let i = 0; i < targets.length; i++) {
      targets[i][0] *= fitScale;
      targets[i][1] *= fitScale;
    }

    const positions = new Float32Array(N * 3);
    const targetArr = new Float32Array(N * 3);
    const randomArr = new Float32Array(N * 3);
    const seeds = new Float32Array(N);

    for (let i = 0; i < N; i++) {
      const [tx, ty] = targets[i];
      targetArr[i * 3] = tx;
      targetArr[i * 3 + 1] = ty;
      targetArr[i * 3 + 2] = 0;
      const r = 4 + Math.random() * 6;
      const a = Math.random() * Math.PI * 2;
      const b = (Math.random() - 0.5) * Math.PI;
      randomArr[i * 3] = Math.cos(a) * Math.cos(b) * r;
      randomArr[i * 3 + 1] = Math.sin(b) * r;
      randomArr[i * 3 + 2] = Math.sin(a) * Math.cos(b) * r * 0.4;
      positions[i * 3] = randomArr[i * 3];
      positions[i * 3 + 1] = randomArr[i * 3 + 1];
      positions[i * 3 + 2] = randomArr[i * 3 + 2];
      seeds[i] = Math.random();
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geo.setAttribute('seed', new THREE.BufferAttribute(seeds, 1));

    const mat = new THREE.ShaderMaterial({
      uniforms: {
        uT: { value: 0 },
        uPx: { value: renderer.getPixelRatio() },
        uMint: { value: new THREE.Color(0x7EE8D3) },
        uAccent: { value: new THREE.Color(0xA8F3E1) },
        uViewport: { value: cv.clientHeight }
      },
      vertexShader: `
        attribute float seed;
        uniform float uT; uniform float uPx; uniform float uViewport;
        varying float vSeed; varying float vDepth;
        void main() {
          vec3 p = position;
          vec4 mv = modelViewMatrix * vec4(p, 1.0);
          float twinkle = 0.85 + sin(uT * 1.4 + seed * 18.0) * 0.35;
          gl_PointSize = (1.4 + seed * 1.8) * twinkle * (uViewport / -mv.z) * 0.06 * uPx;
          vSeed = seed;
          vDepth = -mv.z;
          gl_Position = projectionMatrix * mv;
        }
      `,
      fragmentShader: `
        uniform vec3 uMint; uniform vec3 uAccent;
        varying float vSeed; varying float vDepth;
        void main() {
          vec2 c = gl_PointCoord - 0.5;
          float d = length(c);
          if (d > 0.5) discard;
          float a = smoothstep(0.5, 0.05, d);
          vec3 col = mix(uMint, uAccent, vSeed);
          float fog = clamp(1.0 - (vDepth - 6.0) / 12.0, 0.4, 1.0);
          gl_FragColor = vec4(col * fog, a * (0.55 + vSeed * 0.4));
        }
      `,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending
    });

    const points = new THREE.Points(geo, mat);
    scene.add(points);

    const mouse = new THREE.Vector3(999, 999, 0);
    let pointerActive = false;
    let burst = 0;
    let scrollDispersion = 0;
    let formProgress = 0;

    const heroEl = cv.closest('.hero') || cv.parentElement;
    if (!isMobile && heroEl) {
      heroEl.addEventListener('pointermove', e => {
        const rect = cv.getBoundingClientRect();
        const x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
        const y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
        const half = camera.position.z * Math.tan((camera.fov / 2) * Math.PI / 180);
        mouse.x = x * half * camera.aspect;
        mouse.y = y * half;
        mouse.z = 0;
        pointerActive = true;
      });
      heroEl.addEventListener('pointerleave', () => { pointerActive = false; mouse.set(999, 999, 0); });
      heroEl.addEventListener('pointerdown', e => {
        if (e.target.closest('a, button')) return;
        burst = 1.0;
      });
    }

    const updScroll = () => {
      const sy = window.scrollY || document.documentElement.scrollTop;
      const v = cv.clientHeight;
      scrollDispersion = Math.min(sy / (v * 0.9), 1);
    };
    if (window.__lenis) window.__lenis.on('scroll', updScroll);
    else window.addEventListener('scroll', updScroll, { passive: true });
    updScroll();

    let resizeT;
    const resize = () => {
      const w = cv.clientWidth, h = cv.clientHeight;
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      mat.uniforms.uViewport.value = h;
    };
    window.addEventListener('resize', () => { clearTimeout(resizeT); resizeT = setTimeout(resize, 120); });
    resize();

    let visible = true;
    const io = new IntersectionObserver(es => { visible = es[0].isIntersecting; }, { threshold: 0.01 });
    io.observe(cv);

    const t0 = performance.now();
    let lastT = t0;
    const animate = () => {
      requestAnimationFrame(animate);
      if (!visible) return;
      const now = performance.now();
      const t = (now - t0) / 1000;
      const dt = Math.min((now - lastT) / 1000, 0.1);
      lastT = now;
      mat.uniforms.uT.value = t;

      formProgress += (1 - formProgress) * Math.min(dt * 0.6, 0.1);
      const blend = formProgress * (1 - scrollDispersion);

      const pos = geo.attributes.position.array;
      const idleFreq = 1.3;
      const idleAmp = 0.04;
      const burstStrength = burst;
      const repelRadius = 0.9;
      const repelStrength = pointerActive ? 1.2 : 0;

      for (let i = 0; i < N; i++) {
        const i3 = i * 3;
        const seed = seeds[i];
        const tx = targetArr[i3], ty = targetArr[i3 + 1], tz = targetArr[i3 + 2];
        const rx = randomArr[i3], ry = randomArr[i3 + 1], rz = randomArr[i3 + 2];

        let goalX = tx + Math.sin(t * idleFreq + seed * 12.5) * idleAmp;
        let goalY = ty + Math.cos(t * idleFreq * 0.8 + seed * 8.7) * idleAmp;
        let goalZ = tz + Math.sin(t * 0.7 + seed * 5.0) * 0.05;

        goalX = goalX * blend + rx * (1 - blend);
        goalY = goalY * blend + ry * (1 - blend);
        goalZ = goalZ * blend + rz * (1 - blend);

        let cx = pos[i3], cy = pos[i3 + 1], cz = pos[i3 + 2];

        if (repelStrength > 0) {
          const dx = cx - mouse.x, dy = cy - mouse.y;
          const d2 = dx * dx + dy * dy;
          if (d2 < repelRadius * repelRadius && d2 > 0.0001) {
            const d = Math.sqrt(d2);
            const f = (1 - d / repelRadius) * repelStrength;
            goalX += (dx / d) * f * 0.4;
            goalY += (dy / d) * f * 0.4;
            goalZ += (Math.random() - 0.5) * f * 0.05;
          }
        }

        if (burstStrength > 0.01) {
          const bd = Math.hypot(cx, cy) + 0.001;
          const ang = seed * 6.28;
          goalX += (cx / bd + Math.cos(ang) * 0.3) * burstStrength * 1.6;
          goalY += (cy / bd + Math.sin(ang) * 0.3) * burstStrength * 1.6;
          goalZ += Math.sin(ang * 2) * burstStrength * 0.8;
        }

        const k = 0.085;
        pos[i3] = cx + (goalX - cx) * k;
        pos[i3 + 1] = cy + (goalY - cy) * k;
        pos[i3 + 2] = cz + (goalZ - cz) * k;
      }

      burst *= 0.93;
      geo.attributes.position.needsUpdate = true;
      points.rotation.y = Math.sin(t * 0.12) * 0.04;

      renderer.render(scene, camera);
    };
    animate();
  }
})();
