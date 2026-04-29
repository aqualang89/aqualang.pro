(() => {
  const cv = document.getElementById('threeCanvas');
  if (!cv) return;

  const startThree = () => {
    if (!window.THREE) {
      setTimeout(startThree, 80);
      return;
    }
    const hint = document.getElementById('heroHint');

  const renderer = new THREE.WebGLRenderer({ canvas: cv, antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.6));
  renderer.setSize(cv.clientWidth, cv.clientHeight, false);
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(42, cv.clientWidth / cv.clientHeight, 0.1, 100);
  camera.position.z = 3.4;

  const orb = new THREE.Group();
  scene.add(orb);

  const NOISE_GLSL = `
    vec3 mod289(vec3 x){return x-floor(x*(1./289.))*289.;}
    vec4 mod289(vec4 x){return x-floor(x*(1./289.))*289.;}
    vec4 permute(vec4 x){return mod289(((x*34.)+1.)*x);}
    vec4 taylorInvSqrt(vec4 r){return 1.79284291400159-.85373472095314*r;}
    float snoise(vec3 v){
      const vec2 C=vec2(1./6.,1./3.); const vec4 D=vec4(0.,.5,1.,2.);
      vec3 i=floor(v+dot(v,C.yyy)); vec3 x0=v-i+dot(i,C.xxx);
      vec3 g=step(x0.yzx,x0.xyz); vec3 l=1.-g; vec3 i1=min(g.xyz,l.zxy); vec3 i2=max(g.xyz,l.zxy);
      vec3 x1=x0-i1+C.xxx; vec3 x2=x0-i2+C.yyy; vec3 x3=x0-D.yyy;
      i=mod289(i);
      vec4 p=permute(permute(permute(i.z+vec4(0.,i1.z,i2.z,1.))+i.y+vec4(0.,i1.y,i2.y,1.))+i.x+vec4(0.,i1.x,i2.x,1.));
      float n_=.142857142857; vec3 ns=n_*D.wyz-D.xzx;
      vec4 j=p-49.*floor(p*ns.z*ns.z); vec4 x_=floor(j*ns.z); vec4 y_=floor(j-7.*x_);
      vec4 x=x_*ns.x+ns.yyyy; vec4 y=y_*ns.x+ns.yyyy; vec4 h=1.-abs(x)-abs(y);
      vec4 b0=vec4(x.xy,y.xy); vec4 b1=vec4(x.zw,y.zw);
      vec4 s0=floor(b0)*2.+1.; vec4 s1=floor(b1)*2.+1.; vec4 sh=-step(h,vec4(0.));
      vec4 a0=b0.xzyw+s0.xzyw*sh.xxyy; vec4 a1=b1.xzyw+s1.xzyw*sh.zzww;
      vec3 p0=vec3(a0.xy,h.x); vec3 p1=vec3(a0.zw,h.y); vec3 p2=vec3(a1.xy,h.z); vec3 p3=vec3(a1.zw,h.w);
      vec4 nv=taylorInvSqrt(vec4(dot(p0,p0),dot(p1,p1),dot(p2,p2),dot(p3,p3)));
      p0*=nv.x; p1*=nv.y; p2*=nv.z; p3*=nv.w;
      vec4 m=max(.6-vec4(dot(x0,x0),dot(x1,x1),dot(x2,x2),dot(x3,x3)),0.); m=m*m;
      return 42.*dot(m*m,vec4(dot(p0,x0),dot(p1,x1),dot(p2,x2),dot(p3,x3)));
    }`;

  // detail icosahedron: на 80 это ~50k вершин — overkill для шейдера, тормозит TBT
  const isMobile = window.matchMedia('(max-width: 880px)').matches;
  const detail = isMobile ? 16 : 32;
  const geo = new THREE.IcosahedronGeometry(1.15, detail);

  const uniforms = {
    uT: { value: 0 },
    uPointer: { value: new THREE.Vector3(0, 0, 2) },
    uPointerStrength: { value: 0 },
    uBurst: { value: 0 },
    uBurstOrigin: { value: new THREE.Vector3(0, 0, 1) },
    uMode: { value: 0 },
    uMint: { value: new THREE.Color(0x7EE8D3) },
    uInk: { value: new THREE.Color(0x0A0C0F) },
    uAccent: { value: new THREE.Color(0x4FC3A8) }
  };

  const mat = new THREE.ShaderMaterial({
    uniforms,
    vertexShader: `
      uniform float uT; uniform vec3 uPointer; uniform float uPointerStrength;
      uniform float uBurst; uniform vec3 uBurstOrigin; uniform float uMode;
      varying vec3 vN; varying vec3 vP; varying vec3 vL; varying float vDisp; varying float vBurst;
      ${NOISE_GLSL}
      void main(){
        vec3 pos = position;
        float t = uT*0.45;
        float n1 = snoise(pos*1.4 + vec3(t, t*0.6, -t*0.8));
        float n2 = snoise(pos*2.8 + vec3(-t*0.7, t*1.1, t*0.4));
        float n3 = snoise(pos*5.2 + vec3(t*1.3, -t, t*0.9));
        float liquid = n1*0.18 + n2*0.09 + n3*0.035;
        float spike = abs(n1)*0.32 + pow(abs(n2),0.5)*0.14;
        float facet = floor((n1+n2*0.5)*5.0)/5.0 * 0.22;
        float disp = mix(mix(liquid, spike, step(0.5,uMode)*step(uMode,1.5)),
                         facet, step(1.5,uMode));
        float pd = length(pos - uPointer);
        float pull = exp(-pd*1.6) * uPointerStrength;
        disp += pull * 0.22;
        float bd = length(pos - uBurstOrigin);
        float wave = sin(bd*9.0 - uT*8.0) * exp(-bd*1.2) * uBurst;
        disp += wave * 0.35;
        disp += sin(uT*0.9)*0.012;

        vec3 newPos = pos + normal * disp;
        vN = normal; vP = newPos; vDisp = disp; vBurst = uBurst;
        vL = position;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(newPos, 1.0);
      }`,
    fragmentShader: `
      uniform vec3 uMint; uniform vec3 uInk; uniform vec3 uAccent;
      uniform float uT; uniform float uPointerStrength; uniform vec3 uPointer;
      varying vec3 vN; varying vec3 vP; varying vec3 vL; varying float vDisp; varying float vBurst;
      ${NOISE_GLSL}
      void main(){
        vec3 N = normalize(vN);
        vec3 V = normalize(cameraPosition - vP);
        float fres = pow(1.0 - max(dot(N, V), 0.0), 2.2);
        vec3 L = normalize(vec3(0.4, 0.9, 0.6));
        float diff = max(dot(N, L), 0.0);
        float core = snoise(vL*3.0 + vec3(uT*0.3));
        vec3 base = mix(uInk, uAccent, smoothstep(-0.4, 0.6, core));
        vec3 col = mix(base, uMint, fres*0.95 + max(vDisp,0.0)*1.6);
        float pd = length(vL - uPointer);
        col += exp(-pd*2.4) * uPointerStrength * uMint * 0.8;
        col += vBurst * uMint * 0.6;
        float spec = pow(max(dot(N, normalize(L+V)), 0.0), 32.0);
        col += spec * 0.25;
        col.r += sin(vL.y*9.0 + uT*1.4)*0.018;
        col.b += sin(vL.x*7.0 - uT*1.1)*0.012;
        col *= 0.92 + diff*0.18;
        gl_FragColor = vec4(col, 1.0);
      }`
  });
  const sphere = new THREE.Mesh(geo, mat);
  orb.add(sphere);

  const shellGeo = new THREE.IcosahedronGeometry(1.42, 2);
  const shellMat = new THREE.MeshBasicMaterial({ color: 0x7EE8D3, wireframe: true, transparent: true, opacity: 0.06 });
  const shell = new THREE.Mesh(shellGeo, shellMat);
  orb.add(shell);

  const pCount = isMobile ? 180 : 360;
  const pGeo = new THREE.BufferGeometry();
  const pPos = new Float32Array(pCount * 3);
  const pSeed = new Float32Array(pCount);
  for (let i = 0; i < pCount; i++) {
    const r = 1.7 + Math.random() * 1.7;
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos(2 * Math.random() - 1);
    pPos[i * 3] = r * Math.sin(phi) * Math.cos(theta);
    pPos[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
    pPos[i * 3 + 2] = r * Math.cos(phi);
    pSeed[i] = Math.random();
  }
  pGeo.setAttribute('position', new THREE.BufferAttribute(pPos, 3));
  pGeo.setAttribute('seed', new THREE.BufferAttribute(pSeed, 1));
  const pMat = new THREE.ShaderMaterial({
    uniforms: { uT: { value: 0 }, uBurst: { value: 0 }, uColor: { value: new THREE.Color(0x7EE8D3) } },
    vertexShader: `
      attribute float seed; uniform float uT; uniform float uBurst;
      varying float vSeed;
      void main(){
        vec3 p = position;
        float ang = uT*0.15 + seed*6.28;
        p.x += sin(ang)*0.05; p.y += cos(ang*1.1)*0.05;
        p *= 1.0 + uBurst*0.35*seed;
        vSeed = seed;
        vec4 mv = modelViewMatrix * vec4(p,1.0);
        gl_PointSize = (1.5 + seed*2.5) * (300.0 / -mv.z);
        gl_Position = projectionMatrix * mv;
      }`,
    fragmentShader: `
      uniform vec3 uColor; varying float vSeed;
      void main(){
        vec2 c = gl_PointCoord - 0.5;
        float a = smoothstep(0.5, 0.0, length(c));
        gl_FragColor = vec4(uColor, a*(0.35 + vSeed*0.5));
      }`,
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending
  });
  const points = new THREE.Points(pGeo, pMat);
  orb.add(points);

  let mouseNdc = { x: 0, y: 0 };
  let pointerStr = 0;
  let burst = 0;
  const burstOrigin = new THREE.Vector3(0, 0, 1);
  let mode = 0;
  let isDragging = false;
  let dragStart = null;
  const targetQ = new THREE.Quaternion();
  const curQ = new THREE.Quaternion();
  const dragStartQ = new THREE.Quaternion();
  const tmpQ = new THREE.Quaternion();
  const yAxis = new THREE.Vector3(0, 1, 0);
  const dragAxis = new THREE.Vector3();
  const inertiaAxis = new THREE.Vector3(0, 1, 0);
  let inertiaMag = 0;
  let autoSpin = true;

  const raycaster = new THREE.Raycaster();
  const ndc = new THREE.Vector2();
  const hitGeo = new THREE.SphereGeometry(1.15, 16, 16);
  const hitMesh = new THREE.Mesh(hitGeo, new THREE.MeshBasicMaterial({ visible: false }));
  orb.add(hitMesh);

  const projectPointer = (clientX, clientY) => {
    const rect = cv.getBoundingClientRect();
    ndc.x = ((clientX - rect.left) / rect.width) * 2 - 1;
    ndc.y = -((clientY - rect.top) / rect.height) * 2 + 1;
    raycaster.setFromCamera(ndc, camera);
    const hits = raycaster.intersectObject(hitMesh);
    if (hits.length) {
      const local = hits[0].point.clone();
      orb.worldToLocal(local);
      return local;
    }
    const dir = raycaster.ray.direction.clone();
    const o = raycaster.ray.origin.clone();
    const tt = -o.z / dir.z;
    return o.add(dir.multiplyScalar(tt));
  };

  let dismissedHint = false;
  const dismissHint = () => {
    if (dismissedHint || !hint) return;
    dismissedHint = true;
    hint.classList.add('fade');
  };

  cv.addEventListener('pointermove', e => {
    mouseNdc.x = (e.clientX / window.innerWidth) * 2 - 1;
    mouseNdc.y = -((e.clientY / window.innerHeight) * 2 - 1);
    const local = projectPointer(e.clientX, e.clientY);
    uniforms.uPointer.value.copy(local);
    if (isDragging && dragStart) {
      const dx = e.clientX - dragStart.x;
      const dy = e.clientY - dragStart.y;
      const len = Math.hypot(dx, dy);
      if (len > 0.01) {
        dragAxis.set(dy, dx, 0).normalize();
        const angle = len * 0.006;
        tmpQ.setFromAxisAngle(dragAxis, angle);
        targetQ.copy(tmpQ).multiply(dragStartQ);
      }
      const mx = e.movementX || 0, my = e.movementY || 0;
      const ml = Math.hypot(mx, my);
      if (ml > 0.5) {
        inertiaAxis.set(my, mx, 0).normalize();
        inertiaMag = Math.min(ml * 0.0009, 0.04);
      }
    }
  });
  cv.addEventListener('pointerleave', () => { isDragging = false; cv.classList.remove('dragging'); });
  cv.addEventListener('pointerdown', e => {
    isDragging = true;
    dragStart = { x: e.clientX, y: e.clientY, t: performance.now(), startX: e.clientX, startY: e.clientY };
    dragStartQ.copy(targetQ);
    inertiaMag = 0;
    cv.classList.add('dragging');
    cv.setPointerCapture?.(e.pointerId);
    autoSpin = false;
    dismissHint();
  });
  cv.addEventListener('pointerup', e => {
    cv.classList.remove('dragging');
    if (!isDragging) return;
    isDragging = false;
    const dt = performance.now() - dragStart.t;
    const dist = Math.hypot(e.clientX - dragStart.startX, e.clientY - dragStart.startY);
    if (dt < 280 && dist < 6) {
      const local = projectPointer(e.clientX, e.clientY);
      burstOrigin.copy(local).normalize();
      uniforms.uBurstOrigin.value.copy(burstOrigin);
      burst = 1.0;
    }
  });

  window.addEventListener('keydown', e => {
    if (e.target.matches('input, textarea, [contenteditable]')) return;
    if (e.key === 'r' || e.key === 'R' || e.key === 'к' || e.key === 'К') {
      targetQ.identity();
      inertiaMag = 0;
      autoSpin = true; burst = 1.0;
      burstOrigin.set(0, 0, 1); uniforms.uBurstOrigin.value.copy(burstOrigin);
      dismissHint();
    } else if (e.key === 'm' || e.key === 'M' || e.key === 'ь' || e.key === 'Ь') {
      mode = (mode + 1) % 3;
      uniforms.uMode.value = mode;
      burst = 0.6;
      dismissHint();
    }
  });

  let resizeT;
  const resize = () => {
    const w = cv.clientWidth, h = cv.clientHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  };
  resize();
  window.addEventListener('resize', () => {
    clearTimeout(resizeT);
    resizeT = setTimeout(resize, 120);
  });

  let scrollY = 0;
  const updScroll = () => { scrollY = window.scrollY || document.documentElement.scrollTop; };
  if (window.__lenis) window.__lenis.on('scroll', updScroll); else window.addEventListener('scroll', updScroll);
  updScroll();

  setTimeout(() => dismissHint(), 9000);

  // пауза рендера когда canvas вне вьюпорта (экономим батарею)
  let visible = true;
  const heroIo = new IntersectionObserver(es => { visible = es[0].isIntersecting; }, { threshold: 0.01 });
  heroIo.observe(cv);

  const start = performance.now();
  const animate = () => {
    requestAnimationFrame(animate);
    if (!visible) return;
    const t = (performance.now() - start) / 1000;
    uniforms.uT.value = t;
    pMat.uniforms.uT.value = t;

    const desired = isDragging ? 1.0 : (Math.abs(mouseNdc.x) < 0.7 && Math.abs(mouseNdc.y) < 0.7 ? 0.8 : 0.25);
    pointerStr += (desired - pointerStr) * 0.06;
    uniforms.uPointerStrength.value = pointerStr;

    burst *= 0.94;
    uniforms.uBurst.value = burst;
    pMat.uniforms.uBurst.value = burst;

    if (!isDragging && inertiaMag > 0.0002) {
      tmpQ.setFromAxisAngle(inertiaAxis, inertiaMag);
      targetQ.premultiply(tmpQ);
      inertiaMag *= 0.94;
    }
    if (!isDragging && autoSpin) {
      tmpQ.setFromAxisAngle(yAxis, 0.0028);
      targetQ.premultiply(tmpQ);
    }
    curQ.slerp(targetQ, 0.12);
    orb.quaternion.copy(curQ);
    orb.position.y = -scrollY * 0.0014;

    shell.rotation.y = -t * 0.06;
    shell.rotation.x = t * 0.04;

    renderer.render(scene, camera);
  };
  animate();
  };

  if ('requestIdleCallback' in window) {
    requestIdleCallback(startThree, { timeout: 2000 });
  } else {
    setTimeout(startThree, 200);
  }
})();
