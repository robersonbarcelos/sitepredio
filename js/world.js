/* Mundo: céu, luzes, montanhas, mar, chão, cidade procedural, árvores, postes e trânsito. */
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { Sky } from 'three/addons/objects/Sky.js';

export function makeRng(seed) {
  let s = Math.abs(Math.floor(seed * 48271)) % 2147483647 || 1;
  return () => (s = (s * 16807) % 2147483647) / 2147483647;
}

const BLOCK = 60, ROAD = 10, WALK = 2.6;
const CELL_W = 3.4, CELL_H = 3.15;      // módulo de janela nos prédios da cidade
const C = (h) => new THREE.Color(h);

/* ---------------- texturas procedurais ---------------- */
function canvas(w, h) { const c = document.createElement('canvas'); c.width = w; c.height = h; return [c, c.getContext('2d')]; }

function windowTextures(rng) {
  const N = 8, S = 64;
  const [cm, m] = canvas(N * S, N * S);
  const [ce, e] = canvas(N * S, N * S);
  m.fillStyle = '#efebe3'; m.fillRect(0, 0, N * S, N * S);
  for (let i = 0; i < 9000; i++) { m.fillStyle = `rgba(${rng() < .5 ? '0,0,0' : '255,255,255'},${rng() * .035})`; m.fillRect(rng() * N * S, rng() * N * S, 2, 2); }
  e.fillStyle = '#000'; e.fillRect(0, 0, N * S, N * S);
  for (let r = 0; r < N; r++) {
    m.fillStyle = 'rgba(70,64,58,.10)'; m.fillRect(0, r * S + S - 5, N * S, 5);          // linha de laje
    for (let c = 0; c < N; c++) {
      const x = c * S + 12, y = r * S + 13, w = 40, h = 36;
      const g = m.createLinearGradient(0, y, 0, y + h);
      const t = 70 + rng() * 40;
      g.addColorStop(0, `rgb(${t + 40},${t + 52},${t + 62})`); g.addColorStop(1, `rgb(${t - 20},${t - 8},${t + 4})`);
      m.fillStyle = g; m.fillRect(x, y, w, h);
      if (rng() < .3) { m.fillStyle = 'rgba(235,230,220,.55)'; m.fillRect(x, y, w, h * (.2 + rng() * .6)); } // persiana
      m.fillStyle = 'rgba(40,40,40,.35)'; m.fillRect(x + w / 2 - 1, y, 2, h);
      const p = rng();
      if (p < .42) {
        const warm = rng() < .8;
        const k = .55 + rng() * .45;
        e.fillStyle = warm ? `rgba(255,${190 + rng() * 40 | 0},${120 + rng() * 60 | 0},${k})` : `rgba(200,225,255,${k * .8})`;
        e.fillRect(x, y, w, h);
        if (rng() < .5) { e.fillStyle = 'rgba(0,0,0,.45)'; e.fillRect(x, y, w * (.3 + rng() * .4), h); }
      }
    }
  }
  const map = new THREE.CanvasTexture(cm), emi = new THREE.CanvasTexture(ce);
  for (const t of [map, emi]) { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 8; }
  map.colorSpace = THREE.SRGBColorSpace; emi.colorSpace = THREE.SRGBColorSpace;
  return { map, emi };
}

function noiseTexture(rng, size, base, spots, alpha = .08) {
  const [c, x] = canvas(size, size);
  x.fillStyle = base; x.fillRect(0, 0, size, size);
  for (let i = 0; i < size * size / 14; i++) {
    x.fillStyle = spots[(rng() * spots.length) | 0].replace('A', (rng() * alpha).toFixed(3));
    const r = 1 + rng() * 3; x.fillRect(rng() * size, rng() * size, r, r);
  }
  const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8;
  return t;
}

function waterNormal(rng) {
  const S = 256; const [c, x] = canvas(S, S);
  const img = x.createImageData(S, S);
  const waves = Array.from({ length: 14 }, () => ({ kx: (rng() - .5) * .35, ky: (rng() - .5) * .35, p: rng() * 6.28, a: .3 + rng() }));
  const hgt = (i, j) => waves.reduce((s, w) => s + w.a * Math.sin((i * Math.round(w.kx * 40) + j * Math.round(w.ky * 40)) * Math.PI * 2 / S + w.p), 0);
  for (let j = 0; j < S; j++) for (let i = 0; i < S; i++) {
    const dx = hgt(i + 1, j) - hgt(i - 1, j), dy = hgt(i, j + 1) - hgt(i, j - 1);
    const n = new THREE.Vector3(-dx, -dy, 4).normalize();
    const k = (j * S + i) * 4;
    img.data[k] = (n.x * .5 + .5) * 255; img.data[k + 1] = (n.y * .5 + .5) * 255; img.data[k + 2] = (n.z * .5 + .5) * 255; img.data[k + 3] = 255;
  }
  x.putImageData(img, 0, 0);
  const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; return t;
}

function glowTexture(inner = 'rgba(255,214,160,1)', outer = 'rgba(255,170,90,0)') {
  const [c, x] = canvas(128, 128);
  const g = x.createRadialGradient(64, 64, 0, 64, 64, 64);
  g.addColorStop(0, inner); g.addColorStop(1, outer);
  x.fillStyle = g; x.fillRect(0, 0, 128, 128);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}

/* ---------------- geometria utilitária ---------------- */
function tint(g, col) {
  const n = g.attributes.position.count, a = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) { a[i * 3] = col.r; a[i * 3 + 1] = col.g; a[i * 3 + 2] = col.b; }
  g.setAttribute('color', new THREE.BufferAttribute(a, 3)); return g;
}

function cityBox(w, h, d, x, z, col, uo, vo, y0 = 0) {
  const g = new THREE.BoxGeometry(w, h, d);
  g.translate(x, y0 + h / 2, z);
  const uv = g.attributes.uv;
  const dims = [[d, h], [d, h], null, null, [w, h], [w, h]];
  const roof = col.clone().multiplyScalar(.8);
  const colors = new Float32Array(24 * 3);
  for (let f = 0; f < 6; f++) for (let k = 0; k < 4; k++) {
    const i = f * 4 + k, dm = dims[f], cc = dm ? col : roof;
    colors.set([cc.r, cc.g, cc.b], i * 3);
    if (!dm) { uv.setXY(i, .004, .004); continue; }
    uv.setXY(i, uv.getX(i) * dm[0] / (8 * CELL_W) + uo, uv.getY(i) * dm[1] / (8 * CELL_H) + vo);
  }
  g.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  return g;
}

/* ================================================================== */
export function buildWorld(scene, renderer, cfg, opts = {}) {
  const rng = makeRng(cfg.cena?.seed ?? 7);
  const R = cfg.cena?.raioCidade ?? 420;
  const mobile = opts.mobile;
  const lot = opts.lot || { w: 46, d: 46 };
  const sea = cfg.cena?.mar !== false;          // orla a leste
  const coastX = R + 40;
  const world = new THREE.Group(); scene.add(world);
  const animated = [];

  /* ---------- céu de dia (dispersão atmosférica) ---------- */
  const sky = new Sky(); sky.scale.setScalar(12000);
  const su = sky.material.uniforms;
  su.turbidity.value = 3.2; su.rayleigh.value = 2.1; su.mieCoefficient.value = .0035; su.mieDirectionalG.value = .82;
  const sunDir = new THREE.Vector3().setFromSphericalCoords(1, THREE.MathUtils.degToRad(90 - 34), THREE.MathUtils.degToRad(145));
  su.sunPosition.value.copy(sunDir);
  scene.add(sky);

  /* ---------- céu de noite: domo com gradiente + brilho urbano ---------- */
  const nightDome = new THREE.Mesh(
    new THREE.SphereGeometry(5600, 48, 24),
    new THREE.ShaderMaterial({
      side: THREE.BackSide, depthWrite: false, fog: false,
      uniforms: { zen: { value: C('#040918') }, mid: { value: C('#0b1734') }, hor: { value: C('#25365e') }, glow: { value: C('#5b4d5e') } },
      vertexShader: 'varying vec3 vP; void main(){ vP = normalize(position); vec4 p = projectionMatrix*modelViewMatrix*vec4(position,1.); gl_Position = p.xyww; }',
      fragmentShader: `uniform vec3 zen,mid,hor,glow; varying vec3 vP;
        void main(){ float h = vP.y;
          vec3 c = mix(hor, mid, smoothstep(0.0, 0.18, h)); c = mix(c, zen, smoothstep(0.18, 0.75, h));
          c = mix(c, glow, (1.0 - smoothstep(0.0, 0.07, abs(h))) * 0.55);
          if (h < 0.0) c = mix(hor, vec3(0.03,0.04,0.07), smoothstep(0.0,-0.2,h));
          gl_FragColor = vec4(c, 1.0); }`,
    }));
  nightDome.renderOrder = -2; scene.add(nightDome);

  // estrelas cintilantes
  const NS = 2600, sp = new Float32Array(NS * 3), ss = new Float32Array(NS), sph = new Float32Array(NS);
  for (let i = 0; i < NS; i++) {
    const v = new THREE.Vector3().setFromSphericalCoords(5000, Math.acos(rng() * .92 + .06), rng() * Math.PI * 2);
    sp.set([v.x, v.y, v.z], i * 3); ss[i] = .6 + Math.pow(rng(), 6) * 3.2; sph[i] = rng() * 6.28;
  }
  const sg = new THREE.BufferGeometry();
  sg.setAttribute('position', new THREE.BufferAttribute(sp, 3)); sg.setAttribute('size', new THREE.BufferAttribute(ss, 1)); sg.setAttribute('ph', new THREE.BufferAttribute(sph, 1));
  const starMat = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, fog: false, blending: THREE.AdditiveBlending,
    uniforms: { t: { value: 0 }, pr: { value: renderer.getPixelRatio() } },
    vertexShader: 'attribute float size; attribute float ph; uniform float t, pr; varying float a; void main(){ a = 0.55 + 0.45*sin(t*1.7+ph*3.0); a *= smoothstep(0.0, 0.25, normalize(position).y); vec4 p = projectionMatrix*modelViewMatrix*vec4(position,1.); gl_Position = p.xyww; gl_PointSize = size*pr; }',
    fragmentShader: 'varying float a; void main(){ float d = length(gl_PointCoord-0.5); gl_FragColor = vec4(vec3(0.85,0.9,1.0), a*smoothstep(0.5,0.0,d)); }',
  });
  const stars = new THREE.Points(sg, starMat); stars.renderOrder = -1; scene.add(stars);

  // lua
  const moonDir = new THREE.Vector3(-.45, .52, -.72).normalize();
  const moon = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTexture('rgba(240,244,255,1)', 'rgba(150,175,230,0)'), fog: false, depthWrite: false, transparent: true }));
  moon.scale.setScalar(900); moon.position.copy(moonDir).multiplyScalar(4800);
  const moonDisc = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTexture('rgba(255,255,250,1)', 'rgba(255,255,250,0)'), fog: false, depthWrite: false }));
  moonDisc.scale.setScalar(150); moonDisc.position.copy(moon.position);
  scene.add(moon, moonDisc);

  /* ---------- luzes ---------- */
  const hemi = new THREE.HemisphereLight(0xdfe9f2, 0x5d6450, .9); scene.add(hemi);
  const key = new THREE.DirectionalLight(0xfff1dd, 2.6);
  key.castShadow = true;
  key.shadow.mapSize.set(mobile ? 2048 : 4096, mobile ? 2048 : 4096);
  Object.assign(key.shadow.camera, { left: -230, right: 230, top: 230, bottom: -230, near: 10, far: 1400 });
  key.shadow.bias = -.0003; key.shadow.normalBias = .5; key.shadow.radius = 3;
  scene.add(key, key.target);

  /* ---------- montanhas (3 camadas com perspectiva aérea) ---------- */
  const mountains = [];
  const mLayers = [
    { r: 1700, hmin: 70, hmax: 230, day: '#738a7c', night: '#0c142a', f: 3 },
    { r: 2300, hmin: 140, hmax: 420, day: '#93a8ad', night: '#121d3a', f: 2.2 },
    { r: 3000, hmin: 260, hmax: 640, day: '#b0c0c9', night: '#18264a', f: 1.6 },
  ];
  for (const L of mLayers) {
    const seg = 360, pos = [], idx = [];
    const ph = Array.from({ length: 6 }, () => rng() * 6.28);
    for (let i = 0; i <= seg; i++) {
      const a = (i / seg) * Math.PI * 2;
      let n = 0, amp = 1, fr = L.f, tot = 0;
      for (let o = 0; o < 6; o++) { n += amp * Math.abs(Math.sin(a * fr + ph[o])); tot += amp; amp *= .5; fr *= 2.1; }
      n /= tot;
      let h = L.hmin + (L.hmax - L.hmin) * Math.pow(n, 1.6);
      if (sea && Math.cos(a) > .35) h *= .25;              // abre o horizonte sobre o mar
      pos.push(Math.cos(a) * L.r, -20, Math.sin(a) * L.r, Math.cos(a) * L.r, h, Math.sin(a) * L.r);
      if (i < seg) { const b = i * 2; idx.push(b, b + 1, b + 2, b + 1, b + 3, b + 2); }
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setIndex(idx);
    g.setAttribute('color', new THREE.Float32BufferAttribute(new Float32Array(pos.length), 3));
    const m = new THREE.Mesh(g, new THREE.MeshBasicMaterial({ vertexColors: true, fog: false, side: THREE.DoubleSide }));
    m.userData.L = L; mountains.push(m); world.add(m);
  }
  function paintMountains(night, horizon) {
    for (const m of mountains) {
      const top = C(night ? m.userData.L.night : m.userData.L.day), col = m.geometry.attributes.color;
      for (let i = 0; i < col.count; i++) { const c = i % 2 ? top : top.clone().lerp(horizon, .7); col.setXYZ(i, c.r, c.g, c.b); }
      col.needsUpdate = true;
    }
  }

  /* ---------- chão ---------- */
  const grassTex = noiseTexture(rng, 256, '#7d9168', ['rgba(40,60,30,A)', 'rgba(150,170,110,A)', 'rgba(90,80,50,A)'], .25);
  grassTex.repeat.set(600, 600);
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(9000, 9000), new THREE.MeshStandardMaterial({ map: grassTex, roughness: 1 }));
  ground.rotation.x = -Math.PI / 2; ground.receiveShadow = true; world.add(ground);

  /* ---------- mar e praia ---------- */
  let water = null;
  if (sea) {
    const nrm = waterNormal(rng); nrm.repeat.set(140, 140);
    water = new THREE.Mesh(new THREE.PlaneGeometry(6000, 9000), new THREE.MeshStandardMaterial({ color: 0x3d6f86, roughness: .1, metalness: .15, normalMap: nrm, normalScale: new THREE.Vector2(.35, .35) }));
    water.rotation.x = -Math.PI / 2; water.position.set(coastX + 45 + 3000, .25, 0); water.receiveShadow = true; world.add(water);
    animated.push((dt) => { nrm.offset.x += dt * .004; nrm.offset.y += dt * .0025; });
    const sand = new THREE.Mesh(new THREE.PlaneGeometry(48, 9000), new THREE.MeshStandardMaterial({ map: noiseTexture(rng, 128, '#d8c7a0', ['rgba(120,100,70,A)', 'rgba(255,250,235,A)'], .3), roughness: 1 }));
    sand.material.map.repeat.set(4, 600);
    sand.rotation.x = -Math.PI / 2; sand.position.set(coastX + 22, .12, 0); sand.receiveShadow = true; world.add(sand);
  }

  /* ---------- quadras e ruas ---------- */
  const lines = [];
  for (let k = -12; k <= 12; k++) { const v = BLOCK / 2 + k * BLOCK; if (Math.abs(v) <= R + BLOCK) lines.push(v); }
  const xMax = sea ? coastX : R + BLOCK, ext = R + BLOCK;
  const roadG = [], walkG = [], lotG = [], dashG = [];
  const plane = (w, d, x, z, y) => { const g = new THREE.PlaneGeometry(w, d); g.rotateX(-Math.PI / 2); g.translate(x, y, z); return g; };
  for (const v of lines) {
    roadG.push(plane(ROAD, ext * 2, v, 0, .06));                                 // ruas no eixo z
    if (v < xMax) roadG.push(plane(Math.min(xMax, ext) + ext, ROAD, (Math.min(xMax, ext) - ext) / 2, v, .061)); // eixo x
    for (let s = -ext; s < ext; s += 9) {
      dashG.push(plane(.22, 3.6, v, s, .08));
      if (s < Math.min(xMax, ext) - 4) dashG.push(plane(3.6, .22, s, v, .08));
    }
  }
  if (sea) roadG.push(plane(14, ext * 2, coastX + 1, 0, .065));                    // avenida beira-mar
  const blocks = [];
  for (let i = -8; i <= 8; i++) for (let j = -8; j <= 8; j++) {
    const cx = i * BLOCK, cz = j * BLOCK, d = Math.hypot(cx, cz);
    if (d > R + 20 || (sea && cx + BLOCK / 2 > coastX - 6)) continue;
    blocks.push({ cx, cz, d, i, j });
    const inner = BLOCK - ROAD;
    walkG.push(plane(inner, inner, cx, cz, .09));
  }
  const asphalt = new THREE.MeshStandardMaterial({ color: 0x3a3c41, roughness: .92, map: noiseTexture(rng, 128, '#3a3c41', ['rgba(0,0,0,A)', 'rgba(255,255,255,A)'], .12) });
  asphalt.map.repeat.set(1, 60);
  const roads = new THREE.Mesh(mergeGeometries(roadG), asphalt); roads.receiveShadow = true; world.add(roads);
  const walks = new THREE.Mesh(mergeGeometries(walkG), new THREE.MeshStandardMaterial({ color: 0xc9c4b9, roughness: .95 })); walks.receiveShadow = true; world.add(walks);
  const dashes = new THREE.Mesh(mergeGeometries(dashG), new THREE.MeshStandardMaterial({ color: 0xe9e4d6, roughness: .8 })); world.add(dashes);

  /* ---------- prédios e casas ---------- */
  const tex = windowTextures(rng);
  const bldMat = new THREE.MeshStandardMaterial({ map: tex.map, emissiveMap: tex.emi, emissive: 0xffffff, emissiveIntensity: 0, vertexColors: true, roughness: .82 });
  const houseMat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: .85, flatShading: true });
  const bG = [], hG = [];
  const trees = [], palms = [];
  const walls = ['#f1eee8', '#e9e5dc', '#f4f1ea', '#dcd8cf', '#ece6da', '#e3e6e8', '#f0e7d8'];
  const roofs = ['#a5482f', '#b85a3a', '#8f3f2b', '#c2683f', '#9b4a35', '#7f8484'];
  const inner = BLOCK - ROAD - WALK * 2;

  for (const b of blocks) {
    if (b.i === 0 && b.j === 0) {                                  // lote do empreendimento
      lotG.push(plane(inner, inner, 0, 0, .1));
      const half = inner / 2 - 1.6;
      for (let s = -half; s <= half; s += 5.5) {
        trees.push([s, -half, 1], [-half, s, 1], [half, s, 1]);
        if (Math.abs(s) > 7) trees.push([s, half, 1]);
      }
      continue;
    }
    const r = rng(), near = b.d < 130, adj = b.d < 90;
    const kind = r < (adj ? .25 : .13) ? 'park' : r < (adj ? .8 : near ? .55 : .42) ? 'houses' : 'towers';
    lotG.push(plane(inner, inner, b.cx, b.cz, .1));
    if (kind === 'park') {
      for (let k = 0; k < 34; k++) trees.push([b.cx + (rng() - .5) * inner * .9, b.cz + (rng() - .5) * inner * .9, .8 + rng() * .7]);
    } else if (kind === 'houses') {
      const n = 3, cs = inner / n;
      for (let a = 0; a < n; a++) for (let c = 0; c < n; c++) {
        if (rng() < .1) { trees.push([b.cx - inner / 2 + cs * (a + .5), b.cz - inner / 2 + cs * (c + .5), 1]); continue; }
        const w = 7 + rng() * 4, dd = 7 + rng() * 4, h = 3.2 + (rng() < .35 ? 3 : 0) + rng() * .6;
        const x = b.cx - inner / 2 + cs * (a + .5) + (rng() - .5) * 1.5, z = b.cz - inner / 2 + cs * (c + .5) + (rng() - .5) * 1.5;
        const wall = C(walls[(rng() * walls.length) | 0]);
        const body = new THREE.BoxGeometry(w, h, dd).toNonIndexed(); body.translate(x, h / 2, z); hG.push(tint(body, wall));
        const rf = new THREE.ConeGeometry(1, 2.2 + rng() * .8, 4, 1).toNonIndexed();
        rf.rotateY(Math.PI / 4); rf.scale((w / 2 + .5) / .7071, 1, (dd / 2 + .5) / .7071); rf.translate(x, h + 1.1 + .2, z);
        hG.push(tint(rf, C(roofs[(rng() * roofs.length) | 0])));
        if (rng() < .5) trees.push([x + (rng() < .5 ? -1 : 1) * (w / 2 + 1.6), z + (rng() - .5) * dd, .7]);
      }
    } else {
      const n = rng() < .5 ? 2 : 1, cs = inner / n;
      const far = Math.min(1, Math.max(0, (b.d - 60) / (R - 60)));
      for (let a = 0; a < n; a++) for (let c = 0; c < n; c++) {
        if (n === 2 && rng() < .15) continue;
        const w = (n === 1 ? 18 : 12) + rng() * (n === 1 ? 14 : 7), dd = (n === 1 ? 16 : 11) + rng() * (n === 1 ? 12 : 7);
        const h = 9 + Math.pow(rng(), 1.6) * (12 + far * 52) + (far > .55 && rng() < .07 ? 34 : 0);
        const x = b.cx - inner / 2 + cs * (a + .5), z = b.cz - inner / 2 + cs * (c + .5);
        const col = C(walls[(rng() * walls.length) | 0]).multiplyScalar(.94 + rng() * .08);
        bG.push(cityBox(w, h, dd, x, z, col, ((rng() * 8) | 0) / 8, ((rng() * 8) | 0) / 8));
        if (rng() < .7) bG.push(cityBox(w * .3, 2.4, dd * .3, x + (rng() - .5) * w * .3, z + (rng() - .5) * dd * .3, col.clone().multiplyScalar(.85), 0, 0, h));
        if (rng() < .4) trees.push([x + w / 2 + 2, z - dd / 2 + rng() * dd, .9]);
      }
    }
  }
  // árvores de calçada
  for (const v of lines) for (let s = -ext; s < ext; s += 13) {
    if (rng() < .55 && Math.abs(s) < R) trees.push([v + ROAD / 2 + 1.4, s + rng() * 3, .55 + rng() * .3]);
    if (rng() < .55 && s < xMax - 6 && Math.abs(s) < R) trees.push([s + rng() * 3, v - ROAD / 2 - 1.4, .55 + rng() * .3]);
  }
  if (sea) for (let s = -ext; s < ext; s += 11) palms.push([coastX + 11, s + rng() * 4], [coastX - 8, s + 5 + rng() * 4]);

  const lots = new THREE.Mesh(mergeGeometries(lotG), new THREE.MeshStandardMaterial({ map: grassTex.clone(), color: 0xa9b98f, roughness: 1 }));
  lots.material.map.repeat.set(40, 40); lots.material.map.needsUpdate = true; lots.receiveShadow = true; world.add(lots);
  const blds = new THREE.Mesh(mergeGeometries(bG), bldMat); blds.castShadow = blds.receiveShadow = true; world.add(blds);
  const houses = new THREE.Mesh(mergeGeometries(hG), houseMat); houses.castShadow = houses.receiveShadow = true; world.add(houses);

  /* ---------- árvores (instanciadas) ---------- */
  const canopyG = new THREE.IcosahedronGeometry(1, 1);
  { const p = canopyG.attributes.position; for (let i = 0; i < p.count; i++) { const k = .82 + rng() * .3; p.setXYZ(i, p.getX(i) * k, p.getY(i) * k, p.getZ(i) * k); } canopyG.computeVertexNormals(); }
  const canopy = new THREE.InstancedMesh(canopyG, new THREE.MeshStandardMaterial({ roughness: .9, flatShading: true }), trees.length);
  const trunk = new THREE.InstancedMesh(new THREE.CylinderGeometry(.16, .24, 1, 6), new THREE.MeshStandardMaterial({ color: 0x5a4130, roughness: 1 }), trees.length);
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), sc = new THREE.Vector3(), ps = new THREE.Vector3(), col = new THREE.Color();
  trees.forEach(([x, z, k], i) => {
    const s = (2.3 + rng() * 1.6) * k, th = (2 + rng() * 1.2) * k;
    q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), rng() * 6.28);
    canopy.setMatrixAt(i, m4.compose(ps.set(x, th + s * .8, z), q, sc.set(s, s * (1 + rng() * .25), s)));
    trunk.setMatrixAt(i, m4.compose(ps.set(x, th / 2 + .2, z), q, sc.set(k, th + s * .3, k)));
    canopy.setColorAt(i, col.setHSL(.24 + rng() * .08, .32 + rng() * .18, .26 + rng() * .12));
  });
  canopy.castShadow = trunk.castShadow = true; canopy.receiveShadow = true;
  world.add(canopy, trunk);

  if (palms.length) {
    const leaves = [];
    for (let k = 0; k < 8; k++) { const g = new THREE.BoxGeometry(.5, .08, 4.2); g.translate(0, 0, 2.1); g.rotateX(.42); g.rotateY((k / 8) * Math.PI * 2); leaves.push(g); }
    const crownG = mergeGeometries(leaves);
    const crown = new THREE.InstancedMesh(crownG, new THREE.MeshStandardMaterial({ color: 0x5c7d3c, roughness: .85 }), palms.length);
    const pt = new THREE.InstancedMesh(new THREE.CylinderGeometry(.18, .28, 1, 6), new THREE.MeshStandardMaterial({ color: 0x8a7458, roughness: 1 }), palms.length);
    palms.forEach(([x, z], i) => {
      const h = 7 + rng() * 4; q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), rng() * 6.28);
      pt.setMatrixAt(i, m4.compose(ps.set(x, h / 2, z), q, sc.set(1, h, 1)));
      crown.setMatrixAt(i, m4.compose(ps.set(x, h, z), q, sc.set(1, 1, 1)));
    });
    crown.castShadow = pt.castShadow = true; world.add(crown, pt);
  }

  /* ---------- postes + poças de luz ---------- */
  const lampPos = [];
  for (const v of lines) for (let s = -ext + 12; s < ext; s += 30) {
    if (Math.abs(s) < R + 10) lampPos.push([v - ROAD / 2 - .6, s, v - ROAD / 2 + 2.2, s]);
    if (s < xMax - 8 && Math.abs(s) < R + 10) lampPos.push([s + 15, v + ROAD / 2 + .6, s + 15, v + ROAD / 2 - 2.2]);
  }
  if (sea) for (let s = -ext; s < ext; s += 26) lampPos.push([coastX + 8.6, s, coastX + 6, s]);
  const bulbMat = new THREE.MeshBasicMaterial({ color: 0xffd7a0, toneMapped: false });
  const bulbs = new THREE.InstancedMesh(new THREE.SphereGeometry(.32, 10, 8), bulbMat, lampPos.length);
  const poles = new THREE.InstancedMesh(new THREE.CylinderGeometry(.07, .1, 6.4, 5), new THREE.MeshStandardMaterial({ color: 0x2b2d31, roughness: .6, metalness: .4 }), lampPos.length);
  const poolMat = new THREE.MeshBasicMaterial({ map: glowTexture('rgba(255,196,128,.32)', 'rgba(255,170,90,0)'), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false });
  const pools = new THREE.InstancedMesh(new THREE.PlaneGeometry(9, 9).rotateX(-Math.PI / 2), poolMat, lampPos.length);
  lampPos.forEach(([px, pz, bx, bz], i) => {
    poles.setMatrixAt(i, m4.makeTranslation(px, 3.2, pz));
    bulbs.setMatrixAt(i, m4.makeTranslation(bx, 6.3, bz));
    pools.setMatrixAt(i, m4.makeTranslation(bx, .14, bz));
  });
  world.add(poles, bulbs, pools);

  /* ---------- trânsito ---------- */
  const NC = mobile ? 90 : 170;
  const carG = mergeGeometries([new THREE.BoxGeometry(1.9, .75, 4.3).translate(0, .62, 0), new THREE.BoxGeometry(1.7, .62, 2.3).translate(0, 1.28, -.2)]);
  const lightG = mergeGeometries([
    tint(new THREE.BoxGeometry(.42, .2, .08).translate(-.62, .72, 2.17), C('#fff6e0')), tint(new THREE.BoxGeometry(.42, .2, .08).translate(.62, .72, 2.17), C('#fff6e0')),
    tint(new THREE.BoxGeometry(.42, .18, .08).translate(-.66, .78, -2.17), C('#ff3b2a')), tint(new THREE.BoxGeometry(.42, .18, .08).translate(.66, .78, -2.17), C('#ff3b2a')),
  ]);
  const cars = new THREE.InstancedMesh(carG, new THREE.MeshStandardMaterial({ roughness: .35, metalness: .45 }), NC);
  const carLightMat = new THREE.MeshBasicMaterial({ vertexColors: true, toneMapped: false });
  const carLights = new THREE.InstancedMesh(lightG, carLightMat, NC);
  const beamMat = new THREE.MeshBasicMaterial({ map: glowTexture('rgba(255,240,210,.55)', 'rgba(255,230,190,0)'), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false });
  const beams = new THREE.InstancedMesh(new THREE.PlaneGeometry(4, 9).rotateX(-Math.PI / 2).translate(0, .15, 6.5), beamMat, NC);
  const carPal = ['#e8e8e8', '#1d1f24', '#8a8f96', '#b5b9bf', '#6b1e1e', '#23395b', '#f2f2f2', '#3d4a3a', '#c9c2b0'];
  const carData = Array.from({ length: NC }, (_, i) => {
    const v = lines[(rng() * lines.length) | 0], alongZ = rng() < .5, dir = rng() < .5 ? 1 : -1;
    cars.setColorAt(i, C(carPal[(rng() * carPal.length) | 0]));
    return { v, alongZ, dir, s: (rng() * 2 - 1) * ext, speed: 7 + rng() * 7, lim: alongZ ? [-ext, ext] : [-ext, Math.min(xMax - 6, ext)] };
  });
  cars.castShadow = true; world.add(cars, carLights, beams);
  const yAxis = new THREE.Vector3(0, 1, 0);
  animated.push((dt) => {
    carData.forEach((c, i) => {
      c.s += c.speed * c.dir * dt;
      if (c.s > c.lim[1]) c.s = c.lim[0]; if (c.s < c.lim[0]) c.s = c.lim[1];
      const lane = 2.3 * c.dir;
      if (c.alongZ) { ps.set(c.v + lane, 0, c.s); q.setFromAxisAngle(yAxis, c.dir > 0 ? 0 : Math.PI); }
      else { ps.set(c.s, 0, c.v - lane); q.setFromAxisAngle(yAxis, c.dir > 0 ? Math.PI / 2 : -Math.PI / 2); }
      m4.compose(ps, q, sc.set(1, 1, 1));
      cars.setMatrixAt(i, m4); carLights.setMatrixAt(i, m4); beams.setMatrixAt(i, m4);
    });
    cars.instanceMatrix.needsUpdate = carLights.instanceMatrix.needsUpdate = beams.instanceMatrix.needsUpdate = true;
  });

  /* ---------- ambientes para reflexo (PMREM) ---------- */
  const pmrem = new THREE.PMREMGenerator(renderer);
  const envScene = new THREE.Scene();
  const skyCopy = new Sky(); skyCopy.scale.setScalar(1000); skyCopy.material.uniforms.sunPosition.value.copy(sunDir);
  Object.assign(skyCopy.material.uniforms, {}); ['turbidity', 'rayleigh', 'mieCoefficient', 'mieDirectionalG'].forEach((k) => (skyCopy.material.uniforms[k].value = su[k].value));
  envScene.add(skyCopy);
  const envDay = pmrem.fromScene(envScene, 0, .1, 2000).texture;
  envScene.remove(skyCopy);
  const nd = nightDome.clone(); nd.scale.setScalar(.15); envScene.add(nd);
  const glowRing = new THREE.Mesh(new THREE.CylinderGeometry(600, 600, 60, 32, 1, true), new THREE.MeshBasicMaterial({ color: 0x3a2c22, side: THREE.BackSide }));
  glowRing.position.y = 10; envScene.add(glowRing);
  const envNight = pmrem.fromScene(envScene, 0, .1, 2000).texture;
  pmrem.dispose();

  /* ---------- modo ---------- */
  const fog = new THREE.FogExp2(0xcfdbe3, .00105); scene.fog = fog;
  function setNight(night) {
    sky.visible = !night; nightDome.visible = stars.visible = moon.visible = moonDisc.visible = night;
    scene.environment = night ? envNight : envDay;
    const horizon = C(night ? '#1a2747' : '#c4d5e2');
    fog.color.copy(horizon); fog.density = night ? .0012 : .0008;
    paintMountains(night, horizon);
    hemi.color.set(night ? 0x415a90 : 0xdfe9f2); hemi.groundColor.set(night ? 0x0b0d14 : 0x5d6450); hemi.intensity = night ? .7 : .95;
    const dir = night ? moonDir : sunDir;
    key.position.copy(dir).multiplyScalar(600); key.color.set(night ? 0x9fb8ff : 0xfff1dd); key.intensity = night ? .55 : 2.7;
    bldMat.emissiveIntensity = night ? .8 : 0;
    bulbMat.color.set(night ? 0xffd7a0 : 0x8b8f94);
    pools.visible = beams.visible = night;
    carLightMat.color.set(night ? 0xffffff : 0x555555);
    grassTex.needsUpdate = false;
    ground.material.color.set(night ? 0x8796b8 : 0xffffff);
    lots.material.color.set(night ? 0x8796b8 : 0xa9b98f);
    if (water) { water.material.color.set(night ? 0x0d1a2c : 0x3d6f86); water.material.roughness = night ? .06 : .1; }
  }

  return {
    setNight, envDay, envNight, key, hemi,
    update(dt, t, camera) {
      starMat.uniforms.t.value = t;
      nightDome.position.copy(camera.position); stars.position.copy(camera.position);
      moon.position.copy(moonDir).multiplyScalar(4800).add(camera.position); moonDisc.position.copy(moon.position);
      for (const f of animated) f(dt);
    },
  };
}
