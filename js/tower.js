/* Torre do empreendimento: versão comercial (unidades clicáveis) e versão obra (montada pela data). */
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { STATUS, progress, levelsDone, levelDone, levelDay } from './data.js';
import { makeRng } from './world.js';

const C = (h) => new THREE.Color(h);
const box = (w, h, d, x, y, z) => new THREE.BoxGeometry(w, h, d).translate(x, y + h / 2, z);   // y = base

function uvBox(w, h, d, x, y, z, mu, mv) {
  const g = box(w, h, d, x, y, z), uv = g.attributes.uv;
  const dims = [[d, h], [d, h], [w, d], [w, d], [w, h], [w, h]];
  for (let f = 0; f < 6; f++) for (let k = 0; k < 4; k++) { const i = f * 4 + k; uv.setXY(i, uv.getX(i) * dims[f][0] / mu, uv.getY(i) * dims[f][1] / mv); }
  return g;
}

function canvasTex(w, h, draw, srgb = true) {
  const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 8;
  if (srgb) t.colorSpace = THREE.SRGBColorSpace; return t;
}

/* faces da projeção (w × d) centrada em (ox, oz). u ∈ [-L/2, L/2] da esquerda para a direita de quem olha a face. */
function faces(w, d, ox = 0, oz = 0) {
  return [
    { n: 'S', L: w, nx: 0, nz: 1, pt: (u, i = 0) => [ox + u, oz + d / 2 - i] },
    { n: 'N', L: w, nx: 0, nz: -1, pt: (u, i = 0) => [ox - u, oz - d / 2 + i] },
    { n: 'L', L: d, nx: 1, nz: 0, pt: (u, i = 0) => [ox + w / 2 - i, oz - u] },
    { n: 'O', L: d, nx: -1, nz: 0, pt: (u, i = 0) => [ox - w / 2 + i, oz + u] },
  ];
}
function faceBox(f, u, along, h, depth, y, off) {
  const [x, z] = f.pt(u);
  const g = new THREE.BoxGeometry(f.nx ? depth : along, h, f.nx ? along : depth);
  return g.translate(x + f.nx * off, y + h / 2, z + f.nz * off);
}

class Bag {
  constructor() { this.m = new Map(); }
  add(k, g) { (this.m.get(k) || this.m.set(k, []).get(k)).push(g); }
  build(mats, parent, shadows = true) {
    const out = {};
    for (const [k, list] of this.m) {
      const mixed = list.some((g) => !g.index);
      const mesh = new THREE.Mesh(mergeGeometries(mixed ? list.map((g) => (g.index ? g.toNonIndexed() : g)) : list), mats[k]);
      if (shadows && !mats[k].transparent && !mats[k].isMeshBasicMaterial) { mesh.castShadow = true; mesh.receiveShadow = true; }
      parent.add(mesh); out[k] = mesh;
    }
    return out;
  }
}

/* ================================================================== */
export function buildTower(cfg, storeys, units) {
  const rng = makeRng((cfg.cena?.seed ?? 7) + 101);
  const T = cfg.torre, K = cfg.cores;
  const W = T.largura, D = T.profundidade, PW = T.podio.largura, PD = T.podio.profundidade;

  /* ---------- materiais ---------- */
  const concreteNoise = canvasTex(256, 256, (x, w, h) => {
    x.fillStyle = '#fff'; x.fillRect(0, 0, w, h);
    for (let i = 0; i < 7000; i++) { x.fillStyle = `rgba(0,0,0,${Math.random() * .05})`; x.fillRect(Math.random() * w, Math.random() * h, 2, 2); }
    for (let y = 0; y < h; y += 32) { x.fillStyle = 'rgba(0,0,0,.04)'; x.fillRect(0, y, w, 1); }
  });
  concreteNoise.repeat.set(3, 3);
  const slats = canvasTex(128, 64, (x, w, h) => {
    x.fillStyle = '#17110d'; x.fillRect(0, 0, w, h);
    for (let i = 0; i < 8; i++) { const g = x.createLinearGradient(i * 16, 0, i * 16 + 12, 0); g.addColorStop(0, '#6d4a33'); g.addColorStop(.5, '#a77a55'); g.addColorStop(1, '#4f3423'); x.fillStyle = g; x.fillRect(i * 16 + 2, 0, 11, h); }
  });
  const greenTex = canvasTex(128, 128, (x, w, h) => {
    x.fillStyle = '#2f4a25'; x.fillRect(0, 0, w, h);
    for (let i = 0; i < 1400; i++) { x.fillStyle = `hsl(${85 + Math.random() * 40},${35 + Math.random() * 25}%,${18 + Math.random() * 26}%)`; x.beginPath(); x.arc(Math.random() * w, Math.random() * h, 1.5 + Math.random() * 3, 0, 7); x.fill(); }
  });
  const interior = canvasTex(64, 64, (x, w, h) => {
    const g = x.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, '#fff'); g.addColorStop(.18, '#f2f2f2'); g.addColorStop(.7, '#9a9a9a'); g.addColorStop(1, '#5a5a5a');
    x.fillStyle = g; x.fillRect(0, 0, w, h);
    const r = x.createRadialGradient(w * .5, 4, 1, w * .5, 4, w * .5); r.addColorStop(0, 'rgba(255,255,255,1)'); r.addColorStop(1, 'rgba(255,255,255,0)');
    x.fillStyle = r; x.fillRect(0, 0, w, h * .5);
    x.fillStyle = 'rgba(0,0,0,.42)'; x.fillRect(6, h * .62, 18, h * .38); x.fillRect(38, h * .7, 20, h * .3);   // móveis
    x.fillStyle = 'rgba(0,0,0,.28)'; x.fillRect(0, 0, 5, h); x.fillRect(w - 7, 0, 7, h);                      // cortinas
    x.fillStyle = 'rgba(0,0,0,.55)'; x.fillRect(w / 2 - 1, 0, 2, h);                                         // caixilho
  });
  const mats = {
    facade: new THREE.MeshStandardMaterial({ color: K.fachada, map: concreteNoise, roughness: .82 }),
    facade2: new THREE.MeshStandardMaterial({ color: C(K.fachada).offsetHSL(0, -.04, .06), map: concreteNoise, roughness: .8 }),
    detail: new THREE.MeshStandardMaterial({ color: K.detalhe, roughness: .55, metalness: .1 }),
    lamina: new THREE.MeshStandardMaterial({ color: K.lamina, roughness: .35, metalness: .55 }),
    podio: new THREE.MeshStandardMaterial({ map: slats, roughness: .55, metalness: .3 }),
    warm: new THREE.MeshStandardMaterial({ color: 0x1b1612, emissive: 0xffcf8f, emissiveIntensity: 1, roughness: .15, metalness: .4 }),
    glass: new THREE.MeshStandardMaterial({ color: 0x1a2633, roughness: .07, metalness: .7 }),
    deck: new THREE.MeshStandardMaterial({ color: 0x9b8a76, roughness: .9 }),
    water: new THREE.MeshStandardMaterial({ color: 0x48b7cf, emissive: 0x0e6e88, emissiveIntensity: .2, roughness: .04, metalness: .1 }),
    planter: new THREE.MeshStandardMaterial({ color: 0x4a4440, roughness: .8 }),
    green: new THREE.MeshStandardMaterial({ map: greenTex, roughness: .95, flatShading: true }),
    rail: new THREE.MeshStandardMaterial({ color: 0xcfe3ea, transparent: true, opacity: .28, roughness: .05, metalness: .3, depthWrite: false }),
    strip: new THREE.MeshBasicMaterial({ color: 0xffcf8f, toneMapped: false }),
  };
  mats.green.map.repeat.set(2, 2);

  const group = new THREE.Group();          // comercial
  const bag = new Bag();
  const unitGeo = new Map(units.map((u) => [u.id, { list: [], faceCount: {}, faceSum: {} }]));
  const unitByKey = new Map(units.map((u) => [`${u.floor}-${u.final}`, u]));
  const lazerY = storeys.find((s) => s.kind === 'lazer')?.y ?? storeys.find((s) => s.planta)?.y ?? 0;
  const roofStorey = [...storeys].reverse().find((s) => s.planta);
  const roofY = roofStorey.y + roofStorey.h;
  const atico = storeys.find((s) => s.kind === 'atico');
  const aticoPos = atico ? [-W / 2 + atico.w / 2 + .6, -D / 2 + atico.d / 2 + .6] : null;

  /* panes de um pavimento com planta → atribuídos à unidade pela posição */
  function storeyPanes(s, cb) {
    const wide = !!s.planta.vidroInteiro, modW = wide ? 2.4 : 3.0;
    for (const f of faces(W, D)) {
      const m = Math.max(1, Math.round(f.L / modW)), mw = f.L / m;
      for (let j = 0; j < m; j++) {
        const u = -f.L / 2 + (j + .5) * mw;
        const [px, pz] = f.pt(u, .35);
        const pu = s.planta.unidades.find((q) => px >= q.rect[0] && px <= q.rect[2] && pz >= q.rect[1] && pz <= q.rect[3]);
        cb({ f, u, mw, j, m, pu, unit: pu && unitByKey.get(`${s.floor}-${pu.final}`), wide });
      }
    }
  }

  function deckItems(b, y, w, d, withTrees) {
    b.add('deck', box(w - 1, .06, d - 1, 0, y, 0));
    const pool = [-3.5, d / 2 - (d - D) / 4];
    b.add('water', box(9, .14, Math.min(3.8, (d - D) / 2 - 1.4), pool[0], y + .02, pool[1]));
    for (const [sx, sz, lx, lz] of [[0, d / 2 - .8, w - 2, 1.1], [0, -d / 2 + .8, w - 2, 1.1], [w / 2 - .8, 0, 1.1, d - 2], [-w / 2 + .8, 0, 1.1, d - 2]]) {
      b.add('planter', box(lx, .8, lz, sx, y, sz));
      b.add('green', box(lx - .2, .35, lz - .2, sx, y + .8, sz));
    }
    for (const [sx, sz, lx, lz] of [[0, d / 2, w, .06], [0, -d / 2, w, .06], [w / 2, 0, .06, d], [-w / 2, 0, .06, d]]) b.add('rail', box(lx, 1.1, lz, sx, y, sz));
    if (withTrees) {
      for (let k = 0; k < 14; k++) {
        const a = (k / 14) * Math.PI * 2, rx = (w / 2 - 1.8) * Math.cos(a), rz = (d / 2 - 1.8) * Math.sin(a);
        if (Math.abs(rx) < W / 2 + 1 && Math.abs(rz) < D / 2 + 1) continue;
        const s = 1.2 + rng() * .8;
        b.add('green', new THREE.IcosahedronGeometry(s, 0).translate(rx, y + 1.6 + s, rz));
      }
    }
  }

  /* ---------- montagem comercial ---------- */
  for (const s of storeys) {
    const { y, h, w, d } = s;
    if (s.kind === 'terreo') {
      bag.add('warm', box(w - 1.4, h - .5, d - 1.4, 0, y, 0));
      for (const f of faces(w, d)) for (let u = -f.L / 2 + .4; u <= f.L / 2 - .3; u += f.L / Math.round(f.L / 6)) bag.add('detail', faceBox(f, u, .7, h, .7, y, -.35));
      bag.add('detail', box(w + .6, .5, d + .6, 0, y + h - .5, 0));
      bag.add('detail', box(10, .35, 3.6, 0, y + 3.7, d / 2 + 1.8));
      bag.add('strip', box(9.6, .06, .06, 0, y + 3.66, d / 2 + 3.55));
    } else if (s.kind === 'garagem') {
      bag.add('podio', uvBox(w, h - .3, d, 0, y, 0, 2.6, 1.5));
      bag.add('detail', box(w + .4, .3, d + .4, 0, y + h - .3, 0));
    } else if (s.kind === 'lazer') {
      bag.add('detail', box(PW + .6, .5, PD + .6, 0, y - .5, 0));
      deckItems(bag, y, PW, PD, true);
      bag.add('warm', box(w - .8, h - .45, d - .8, 0, y, 0));
      for (const [cx, cz] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) bag.add('detail', box(.7, h, .7, cx * (w / 2 - .35), y, cz * (d / 2 - .35)));
      bag.add('detail', box(w + .6, .45, d + .6, 0, y + h - .45, 0));
    } else if (s.planta) {
      bag.add('facade', box(w - .3, h, d - .3, 0, y, 0));
      bag.add('detail', box(w + .36, .34, d + .36, 0, y, 0));
      if (s.planta.vidroInteiro) bag.add('detail', box(w + .1, .16, d + .1, 0, y + h * .5, 0));
      storeyPanes(s, ({ f, u, mw, j, m, unit, wide }) => {
        if (j > 0) bag.add('facade2', faceBox(f, u - mw / 2, .22, h - .34, .4, y + .34, .05));
        if (!unit) return;                                            // núcleo: parede
        const balcony = unit.sacada === f.n;
        const ph = wide ? h * .86 : balcony ? h * .78 : h * .58;
        const sill = wide ? .3 : balcony ? .38 : h * .26;
        const pw = mw * (wide ? .9 : balcony ? .84 : .66);
        const geo = unitGeo.get(unit.id);
        geo.list.push(faceBox(f, u, pw, ph, .12, y + sill, .05));
        const [px, pz] = f.pt(u);
        geo.faceCount[f.n] = (geo.faceCount[f.n] || 0) + 1;
        const fs = geo.faceSum[f.n] || (geo.faceSum[f.n] = new THREE.Vector3());
        fs.add(new THREE.Vector3(px, y + sill + ph / 2, pz));
        if (balcony) {
          bag.add('detail', faceBox(f, u, mw - .1, .2, 1.6, y + .34, .8));
          bag.add('rail', faceBox(f, u, mw - .1, 1.05, .05, y + .54, 1.58));
        }
      });
    } else if (s.kind === 'atico') {
      const [ax, az] = aticoPos;
      bag.add('facade', box(w, h, d, ax, y, az));
      for (const f of faces(w, d, ax, az)) for (let u = -f.L / 2 + .8; u < f.L / 2; u += 1.6) bag.add('detail', faceBox(f, u, .14, h - .4, .2, y + .2, .05));
      bag.add('detail', box(w + .5, .35, d + .5, ax, y + h - .35, az));
    }
  }
  // cobertura (rooftop)
  bag.add('detail', box(W + .36, .34, D + .36, 0, roofY, 0));
  bag.add('deck', box(W - .6, .06, D - .6, 0, roofY + .34, 0));
  for (const [sx, sz, lx, lz] of [[0, D / 2, W, .06], [0, -D / 2, W, .06], [W / 2, 0, .06, D], [-W / 2, 0, .06, D]]) bag.add('rail', box(lx, 1.15, lz, sx, roofY + .34, sz));
  bag.add('strip', box(W + .5, .07, .07, 0, roofY + .3, D / 2 + .2));
  if (T.rooftop?.piscina) bag.add('water', box(7.2, .16, 3.4, W / 2 - 4.6, roofY + .36, D / 2 - 2.8));
  for (let k = 0; k < 7; k++) bag.add('detail', box(.16, .26, 6, -1.2 + k * 1.1, roofY + 3.2, D / 2 - 3.4));
  for (const [px, pz] of [[-1.3, D / 2 - .5], [5.4, D / 2 - .5], [-1.3, D / 2 - 6.3], [5.4, D / 2 - 6.3]]) bag.add('detail', box(.2, 3, .2, px, roofY + .34, pz));
  // jardim vertical na frente do pódio
  const gw = storeys.filter((s) => s.kind === 'garagem');
  if (gw.length) bag.add('green', uvBox(11, gw.length * gw[0].h, .5, -PW / 2 + 7, gw[0].y, PD / 2 + .25, 6, 6));
  // lâmina vertical
  const strips = [];
  if (T.lamina) {
    const y0 = lazerY, H = roofY + (T.lamina.altura ?? 8) - y0;
    bag.add('lamina', box(.9, H, 1.3, T.lamina.x, y0, D / 2 + .65));
    bag.add('strip', box(.1, H - 1.5, .04, T.lamina.x, y0 + .75, D / 2 + 1.32));
  }
  const parts = bag.build(mats, group);
  if (parts.strip) strips.push(parts.strip);

  /* ---------- unidades ---------- */
  const unitMeshes = [];
  for (const u of units) {
    const g = unitGeo.get(u.id);
    if (!g.list.length) { console.warn(`Unidade ${u.id} sem janela na fachada: confira o rect na planta.`); continue; }
    const geom = mergeGeometries(g.list);
    const mat = new THREE.MeshStandardMaterial({ roughness: .3, emissiveMap: interior });
    const mesh = new THREE.Mesh(geom, mat);
    mesh.userData.unit = u;
    const edges = new THREE.LineSegments(new THREE.EdgesGeometry(geom, 20), new THREE.LineBasicMaterial({ color: K.contorno, transparent: true, opacity: .95, toneMapped: false }));
    edges.visible = false;
    const best = Object.entries(g.faceCount).sort((a, b) => b[1] - a[1] || 'SLON'.indexOf(a[0]) - 'SLON'.indexOf(b[0]))[0][0];
    const n = { S: [0, 1], N: [0, -1], L: [1, 0], O: [-1, 0] }[best];
    u.center = g.faceSum[best].clone().divideScalar(g.faceCount[best]);
    u.normal = new THREE.Vector3(n[0], 0, n[1]);
    u.mesh = mesh; u.edges = edges; u.k = .42 + rng() * .32; u.ph = rng() * 6.28;
    group.add(mesh, edges); unitMeshes.push(mesh);
  }

  /* ---------- luzes de destaque (noite) ---------- */
  const uplights = [];
  for (const [x, z] of [[-W / 2 - 1.5, D / 2 + 3], [W / 2 + 1.5, D / 2 + 3], [0, -D / 2 - 3]]) {
    const l = new THREE.PointLight(0xffc98a, 0, 34, 1.6); l.position.set(x, lazerY + 1.2, z); group.add(l); uplights.push(l);
  }

  /* ================== OBRA ================== */
  const obra = new THREE.Group(); obra.visible = false;
  const om = {
    concrete: new THREE.MeshStandardMaterial({ color: 0xaba69e, map: concreteNoise, roughness: .9 }),
    forms: new THREE.MeshStandardMaterial({ color: 0xd2a145, roughness: .8 }),
    brick: new THREE.MeshStandardMaterial({ color: 0xb4603e, map: canvasTex(64, 64, (x) => { x.fillStyle = '#b4603e'; x.fillRect(0, 0, 64, 64); x.fillStyle = 'rgba(230,210,190,.55)'; for (let r = 0; r < 8; r++) { x.fillRect(0, r * 8, 64, 1); for (let c = 0; c < 4; c++) x.fillRect(((c * 16) + (r % 2) * 8) % 64, r * 8, 1, 8); } }), roughness: .95 }),
    ghost: new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: .16 }),
    hot: new THREE.LineBasicMaterial({ color: 0xf6c27a, transparent: true, opacity: .95, toneMapped: false }),
    hit: new THREE.MeshBasicMaterial({ visible: false }),
  };
  om.brick.map.repeat.set(6, 2);
  const finalMat = (s) => (s.kind === 'garagem' ? mats.podio : s.kind === 'terreo' || s.kind === 'lazer' ? mats.glass : mats.facade);
  const obraStoreys = storeys.map((s, i) => {
    const [ox, oz] = s.kind === 'atico' ? aticoPos : [0, 0];
    const { y, h, w, d } = s;
    const cols = [];
    const nx = Math.max(2, Math.round(w / 6) + 1), nz = Math.max(2, Math.round(d / 6) + 1);
    for (let a = 0; a < nx; a++) for (let b = 0; b < nz; b++) cols.push(box(.5, h, .5, ox - w / 2 + .4 + (a * (w - .8)) / (nx - 1), y, oz - d / 2 + .4 + (b * (d - .8)) / (nz - 1)));
    const colM = new THREE.Mesh(mergeGeometries(cols), om.concrete);
    const slab = new THREE.Mesh(box(w + .3, .34, d + .3, ox, y + h - .34, oz), om.concrete);
    const forms = new THREE.Mesh(box(w + .9, .55, d + .9, ox, y + h - .5, oz), om.forms);
    const wall = new THREE.Mesh(uvBox(w - .3, h - .34, d - .3, ox, y, oz, 6, 3), om.brick);
    let panes = null;
    if (s.planta) {
      const pg = [];
      storeyPanes(s, ({ f, u, mw, unit, wide }) => { if (unit || wide) pg.push(faceBox(f, u, mw * (wide ? .9 : .66), wide ? h * .86 : h * .58, .12, y + (wide ? .3 : h * .26), .05)); });
      if (pg.length) panes = new THREE.Mesh(mergeGeometries(pg), mats.glass);
    }
    const ghost = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(w, h, d).translate(ox, y + h / 2, oz)), om.ghost);
    const hit = new THREE.Mesh(new THREE.BoxGeometry(w + .6, h, d + .6).translate(ox, y + h / 2, oz), om.hit);
    hit.userData.storey = i;
    for (const m of [colM, slab, forms, wall, panes]) if (m) { m.castShadow = m.receiveShadow = true; obra.add(m); }
    obra.add(ghost, hit);
    return { s, colM, slab, forms, wall, panes, ghost, hit, final: finalMat(s) };
  });
  const obraBag = new Bag(), obraRoof = new Bag();
  deckItems(obraBag, lazerY, PW, PD, true);
  obraRoof.add('deck', box(W - .6, .06, D - .6, 0, roofY, 0));
  if (T.rooftop?.piscina) obraRoof.add('water', box(7.2, .16, 3.4, W / 2 - 4.6, roofY + .02, D / 2 - 2.8));
  const lazerParts = new THREE.Group(), roofParts = new THREE.Group();
  obraBag.build(mats, lazerParts); obraRoof.build(mats, roofParts);
  obra.add(lazerParts, roofParts);
  // grua
  const crane = new THREE.Group();
  const cm = new THREE.MeshStandardMaterial({ color: 0xe3b021, roughness: .6, metalness: .3 });
  const mastH = roofY + 26, mast = [];
  for (const [a, b] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) mast.push(box(.2, mastH, .2, a * .8, 0, b * .8));
  for (let yy = 0; yy < mastH; yy += 2) { mast.push(box(1.8, .12, .12, 0, yy, .8), box(1.8, .12, .12, 0, yy, -.8), box(.12, .12, 1.8, .8, yy, 0), box(.12, .12, 1.8, -.8, yy, 0)); }
  const mastM = new THREE.Mesh(mergeGeometries(mast), cm); mastM.castShadow = true;
  const jib = new THREE.Group();
  const jibG = [box(.9, .9, 44, 0, 0, 20), box(.9, .7, 14, 0, 0, -8), box(.4, 6, .4, 0, 0, 0), box(2.2, 1.8, 2.4, 1.5, -2.2, 1.2)];
  const jibM = new THREE.Mesh(mergeGeometries(jibG), cm); jibM.castShadow = true;
  const cw = new THREE.Mesh(box(2.4, 2, 3, 0, -2, -13), om.concrete);
  const cable = new THREE.Mesh(box(.05, 14, .05, 0, -14, 30), new THREE.MeshBasicMaterial({ color: 0x222222 }));
  jib.add(jibM, cw, cable);
  crane.add(mastM, jib);
  crane.position.set(PW / 2 - 3, 0, -PD / 2 + 3);
  obra.add(crane);
  // tapume + terra
  const site = new THREE.Group();
  const fw = PW + 8, fd = PD + 8;
  const fenceM = new THREE.MeshStandardMaterial({ color: 0xe9e7e2, roughness: .8 });
  site.add(new THREE.Mesh(mergeGeometries([box(fw, 2.2, .12, 0, 0, fd / 2), box(fw, 2.2, .12, 0, 0, -fd / 2), box(.12, 2.2, fd, fw / 2, 0, 0), box(.12, 2.2, fd, -fw / 2, 0, 0)]), fenceM));
  site.add(new THREE.Mesh(mergeGeometries([box(fw, .35, .14, 0, 1.5, fd / 2), box(fw, .35, .14, 0, 1.5, -fd / 2), box(.14, .35, fd, fw / 2, 1.5, 0), box(.14, .35, fd, -fw / 2, 1.5, 0)]), new THREE.MeshStandardMaterial({ color: 0x2c5f8a })));
  const dirt = new THREE.Mesh(new THREE.PlaneGeometry(fw, fd).rotateX(-Math.PI / 2).translate(0, .13, 0), new THREE.MeshStandardMaterial({ color: 0x8a6a4a, roughness: 1 }));
  dirt.receiveShadow = true; site.add(dirt);
  obra.add(site);

  /* papéis das etapas (pelo campo papel ou pelo nome) */
  const roleOf = (e) => e.papel || [['estrut', 'estrutura'], ['alven', 'alvenaria'], ['fachad', 'fachada'], ['esquad', 'esquadrias'], ['acaba', 'acabamentos'], ['lazer', 'lazer'], ['paisag', 'lazer'], ['vistor', 'entrega'], ['entreg', 'entrega']]
    .find(([k]) => e.nome.toLowerCase().includes(k))?.[1];

  function applyObra(day, sched) {
    const R = {}; for (const e of sched.etapas) R[roleOf(e)] = e;
    const n = storeys.length;
    const kS = R.estrutura ? levelsDone(R.estrutura, day, n) : n;
    const pS = R.estrutura ? progress(R.estrutura, day) : 1;
    obraStoreys.forEach((o, i) => {
      const done = i < kS, inprog = i === kS && pS > 0 && kS < n;
      o.colM.visible = done || inprog; o.slab.visible = done; o.forms.visible = inprog;
      const alv = done && (!R.alvenaria || levelDone(R.alvenaria, day, i, n));
      const fac = alv && (!R.fachada || levelDone(R.fachada, day, i, n));
      o.wall.visible = alv; o.wall.material = fac ? o.final : om.brick;
      if (o.panes) o.panes.visible = alv && (!R.esquadrias || levelDone(R.esquadrias, day, i, n));
      o.ghost.visible = !done || o.hot;
      o.ghost.material = o.hot ? om.hot : om.ghost;
    });
    const top = kS ? storeys[kS - 1].y + storeys[kS - 1].h : 0;
    const pF = R.fachada ? progress(R.fachada, day) : 1, pL = R.lazer ? progress(R.lazer, day) : 1, pE = R.entrega ? progress(R.entrega, day) : 1;
    crane.visible = pS > 0 && pF < 1;
    mastM.position.y = Math.max(top + 14, 24) - mastH; jib.position.y = mastM.position.y + mastH;
    lazerParts.visible = pL > .45; roofParts.visible = pL > .9 && kS === n;
    site.visible = pE < .5; dirt.visible = pL < .45;
    return { kS, n };
  }

  /* ---------- modo e animação ---------- */
  let night = true;
  function setNight(b) {
    night = b;
    for (const [k, c, i] of [['facade', 0x6b3b24, .3], ['facade2', 0x7a4630, .34], ['detail', 0x3a2416, .22], ['lamina', 0x5a3420, .25], ['podio', 0x4a2f1c, .5]]) { mats[k].emissive.set(c); mats[k].emissiveIntensity = b ? i : 0; }
    mats.warm.emissiveIntensity = b ? 1.15 : .06; mats.warm.color.set(b ? 0x1b1612 : 0x2b3540);
    mats.water.emissiveIntensity = b ? 1.1 : .2;
    mats.strip.color.set(b ? 0xffcf8f : 0x6b5a48);
    uplights.forEach((l) => (l.intensity = b ? 120 : 0));
    for (const u of units) if (u.mesh) {
      const m = u.mesh.material, lit = STATUS[u.status]?.lit;
      if (b) { m.metalness = lit ? .1 : .55; m.roughness = lit ? .4 : .1; m.envMapIntensity = .5; }
      else { m.metalness = lit ? .05 : .65; m.roughness = lit ? .5 : .07; m.envMapIntensity = 1.15; }
    }
  }

  const litC = C(K.luzVendida), contC = C(K.contorno), selC = C(K.selecao), black = C('#000');
  function update(t, st, dt = .016) {
    jib.rotation.y += dt * .05;
    for (const u of units) {
      if (!u.mesh) continue;
      const m = u.mesh.material, lit = STATUS[u.status]?.lit, sel = st.selected === u, hov = st.hovered === u;
      const contour = st.contour && u.status === 'd';
      if (night) { m.color.set(lit ? 0x24170d : 0x0c141f); m.emissive.copy(lit ? litC : black); m.emissiveIntensity = lit ? u.k * 1.6 * (u.status === 'r' ? .55 : 1) : 0; }
      else { m.color.set(lit ? 0xc6a687 : 0x4d697e); m.emissive.copy(black); m.emissiveIntensity = 0; }
      const pulse = .5 + .5 * Math.sin(t * 3 + u.ph * .3);
      if (contour) { m.emissive.copy(contC); m.emissiveIntensity = (night ? .3 : .18) + pulse * (night ? .35 : .2); }
      if (sel) { m.emissive.copy(selC); m.emissiveIntensity = night ? 2.6 + .9 * Math.sin(t * 4) : 1.1 + .4 * Math.sin(t * 4); }
      if (hov && !sel) { if (!lit || !night) m.emissive.copy(lit ? litC : contC); m.emissiveIntensity += night ? .35 : .25; }
      u.edges.visible = sel || contour;
      u.edges.material.color.copy(sel ? selC : contC);
      u.edges.material.opacity = sel ? 1 : .5 + pulse * .5;
    }
  }

  const obraHits = obraStoreys.map((o) => o.hit);
  function setObraHover(i) { obraStoreys.forEach((o, k) => (o.hot = k === i)); }
  function storeyStructDay(i, sched) {
    const e = sched.etapas.find((x) => roleOf(x) === 'estrutura');
    return e ? levelDay(e, i, storeys.length) : sched.inicio;
  }

  return { group, obra, unitMeshes, obraHits, setNight, update, applyObra, setObraHover, storeyStructDay, roleOf, height: roofY + (atico?.h ?? 0), roofY };
}
