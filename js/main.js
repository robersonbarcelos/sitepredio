/* Orquestração: renderer, pós-processamento, câmera, interação e modos. */
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { CFG, TAB, buildStoreys, buildUnits, buildSchedule, salesStats, mesAno } from './data.js';
import { buildWorld } from './world.js';
import { buildTower } from './tower.js';
import * as UI from './ui.js';
import { initObraUI } from './obra-ui.js';

const vw = () => Math.max(1, innerWidth), vh = () => Math.max(1, innerHeight);
const mobile = matchMedia('(max-width: 760px)').matches || /Mobi|Android/i.test(navigator.userAgent);
const touch = matchMedia('(hover: none)').matches;

/* ---------- dados ---------- */
const storeys = buildStoreys();
const units = buildUnits(CFG, TAB, storeys);
const stats = salesStats(units);
const sched = buildSchedule(CFG, storeys);
const byId = new Map(units.map((u) => [u.id, u]));

UI.initBrand();
UI.setBrandSub('com', units);
let readyResolve;
const ready = new Promise((r) => (readyResolve = r));
const introDone = UI.runIntro(stats, ready);

/* ---------- renderer ---------- */
const canvas = document.getElementById('scene');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(devicePixelRatio, mobile ? 1.75 : 2));
renderer.setSize(vw(), vh());
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(38, vw() / vh(), 1, 16000);

const world = buildWorld(scene, renderer, CFG, { mobile });
const tower = buildTower(CFG, storeys, units);
scene.add(tower.group, tower.obra);

/* ---------- pós-processamento ---------- */
const rt = new THREE.WebGLRenderTarget(vw(), vh(), { type: THREE.HalfFloatType, samples: mobile ? 2 : 4 });
const composer = new EffectComposer(renderer, rt);
composer.setPixelRatio(renderer.getPixelRatio());
composer.addPass(new RenderPass(scene, camera));
const bloom = new UnrealBloomPass(new THREE.Vector2(vw(), vh()), .8, .55, .72);
composer.addPass(bloom);
composer.addPass(new OutputPass());
const grade = new ShaderPass({
  uniforms: { tDiffuse: { value: null }, vig: { value: .5 }, sat: { value: 1.06 }, contrast: { value: 1.05 }, lift: { value: new THREE.Vector3() }, gain: { value: new THREE.Vector3(1, 1, 1) } },
  vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.); }',
  fragmentShader: `uniform sampler2D tDiffuse; uniform float vig, sat, contrast; uniform vec3 lift, gain; varying vec2 vUv;
    void main(){ vec4 c = texture2D(tDiffuse, vUv); vec3 col = c.rgb;
      col = (col - 0.5) * contrast + 0.5;
      float l = dot(col, vec3(.2126,.7152,.0722)); col = mix(vec3(l), col, sat);
      col = col * gain + lift * (1.0 - col);
      vec2 d = vUv - 0.5; col *= 1.0 - vig * dot(d, d) * 1.5;
      gl_FragColor = vec4(clamp(col, 0.0, 1.0), c.a); }`,
});
composer.addPass(grade);

/* ---------- câmera e órbita ---------- */
const H = tower.height;
const controls = new OrbitControls(camera, canvas);
Object.assign(controls, { enableDamping: true, dampingFactor: .07, minDistance: 28, maxDistance: 460, maxPolarAngle: 1.48, minPolarAngle: .12, rotateSpeed: .6, zoomSpeed: .9, autoRotateSpeed: .45, screenSpacePanning: true });
controls.autoRotate = CFG.cena?.girarAoAbrir !== false;

const VIEWS = {
  frente: { az: .36, el: .1, k: 1.12 },
  lateral: { az: 1.52, el: .12, k: 1.12 },
  fundos: { az: Math.PI + .42, el: .14, k: 1.12 },
  rooftop: { az: .78, el: .5, k: .5, ty: tower.roofY },
};
function fitDist() {
  const tanV = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
  const byH = (H * 1.32) / 2 / tanV;
  const byW = 46 / (tanV * camera.aspect);
  return Math.max(byH, byW);
}
const state = { mode: 'com', night: CFG.cena?.modoInicial !== 'dia', contour: false, selected: null, hovered: null, view: 'frente' };
function viewPose(name, mul = 1, elAdd = 0) {
  const obra = state.mode === 'obra' && name !== 'rooftop';
  const v = VIEWS[name], target = new THREE.Vector3(0, v.ty ?? H * (obra ? .3 : .53), 0);
  const dist = fitDist() * v.k * mul * (obra ? 1.2 : 1), el = v.el + elAdd + (obra ? .16 : 0) + (camera.aspect < 1 ? .1 : 0);
  const pos = target.clone().add(new THREE.Vector3(Math.sin(v.az) * Math.cos(el), Math.sin(el), Math.cos(v.az) * Math.cos(el)).multiplyScalar(dist));
  return { pos, target };
}
let tween = null;
const ease = (t) => (t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
function flyTo({ pos, target }, dur = 1.4) {
  tween = { p0: camera.position.clone(), t0: controls.target.clone(), p1: pos, t1: target, start: null, dur: dur * 1000 };
}
const start = viewPose('frente', 3.4, .42);
camera.position.copy(start.pos); controls.target.copy(start.target); controls.update();

/* ---------- estado ---------- */
let obraUI = null, nightBeforeObra = state.night;

function setNight(b) {
  state.night = b;
  world.setNight(b); tower.setNight(b);
  renderer.toneMappingExposure = b ? 1.05 : .92;
  Object.assign(bloom, { strength: b ? .62 : .14, radius: b ? .55 : .35, threshold: b ? .82 : .96 });
  const u = grade.uniforms;
  u.vig.value = b ? .62 : .36; u.sat.value = b ? 1.1 : 1.07; u.contrast.value = b ? 1.06 : 1.05;
  u.lift.value.set(b ? 0 : .005, b ? .006 : .004, b ? .022 : 0); u.gain.value.set(b ? .99 : 1.025, 1, b ? 1.03 : .97);
  press('#mode-night', b); press('#mode-day', !b);
}
const press = (sel, on) => document.querySelector(sel)?.setAttribute('aria-pressed', String(on));

function setView(name) {
  state.view = name;
  document.querySelectorAll('#views button').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.view === name)));
  flyTo(viewPose(name));
}
function setRotate(on) { controls.autoRotate = on; press('#t-rotate', on); }
function setContour(on) { state.contour = on; press('#t-avail', on); }

/* ---------- seleção ---------- */
function select(u, { fly = true } = {}) {
  state.selected = u || null;
  UI.markMirror(u?.id);
  UI.showCard(u, units, { onClose: () => select(null), onNav: (d) => select(UI.nextAvailable(units, state.selected, d)) });
  history.replaceState(null, '', u ? `#u=${u.id}` : location.pathname + location.search);
  if (!u) { UI.setHint(touch ? 'Toque em uma unidade na fachada' : 'Clique em uma unidade na fachada'); return; }
  UI.setHint('');
  if (fly && u.center) {
    setRotate(false);
    const side = new THREE.Vector3(u.normal.z, 0, -u.normal.x);   // direita de quem olha a face
    const dist = Math.max(115, fitDist() * .9);
    const wide = innerWidth > 760;
    // deixa a unidade à esquerda do centro quando o card ocupa a direita da tela
    const target = u.center.clone().addScaledVector(side, wide ? 13 : 0).add(new THREE.Vector3(0, wide ? 0 : -8, 0));
    flyTo({ pos: target.clone().addScaledVector(u.normal, dist).addScaledVector(side, 26).add(new THREE.Vector3(0, 10, 0)), target }, 1.1);
  }
}

/* ---------- modo comercial / obra ---------- */
function setMode(mode) {
  state.mode = mode;
  press('#tab-com', mode === 'com'); press('#tab-obra', mode === 'obra');
  const obra = mode === 'obra';
  tower.group.visible = !obra; tower.obra.visible = obra;
  document.getElementById('summary').classList.toggle('hide', obra);
  document.getElementById('t-avail').classList.toggle('hide', obra);
  UI.setBrandSub(mode, units);
  if (obra) {
    select(null); UI.setHint('');
    nightBeforeObra = state.night; setNight(false);
    obraUI ||= initObraUI(sched, storeys, tower);
    obraUI.show();
    flyTo(viewPose(state.view));
    UI.setHint(touch ? 'Arraste a linha do tempo ou toque num pavimento' : 'Arraste a linha do tempo ou clique num pavimento', { top: true, autoHide: 7000 });
  } else {
    obraUI?.hide(); tower.setObraHover(-1);
    setNight(nightBeforeObra);
    flyTo(viewPose(state.view));
    UI.setHint(touch ? 'Toque em uma unidade na fachada' : 'Clique em uma unidade na fachada');
  }
  hovered(null);
}

/* ---------- raycast ---------- */
const ray = new THREE.Raycaster(), ndc = new THREE.Vector2();
const occluders = tower.group.children.filter((o) => o.isMesh && !o.material.transparent);
function pick(cx, cy) {
  const r = canvas.getBoundingClientRect();
  ndc.set(((cx - r.left) / r.width) * 2 - 1, -((cy - r.top) / r.height) * 2 + 1);
  ray.setFromCamera(ndc, camera);
  if (state.mode === 'obra') {
    const hit = ray.intersectObjects(tower.obraHits, false)[0];
    return hit ? { storey: hit.object.userData.storey } : null;
  }
  const hit = ray.intersectObjects(occluders, false)[0];
  if (!hit) return null;
  if (hit.object.userData.unit) return { unit: hit.object.userData.unit };
  const u = unitAt(hit.point);
  return u ? { unit: u } : null;
}
/* toque na parede/friso entre janelas: acha a unidade daquele trecho da fachada */
function unitAt(p) {
  const T = CFG.torre;
  if (Math.abs(p.x) > T.largura / 2 + 2 || Math.abs(p.z) > T.profundidade / 2 + 2) return null;
  const s = storeys.find((q) => q.planta && p.y >= q.y && p.y < q.y + q.h);
  if (!s) return null;
  let best = null, bd = Infinity;
  for (const u of units) {
    if (u.floor !== s.floor) continue;
    const [x0, z0, x1, z1] = u.rect;
    const d = Math.hypot(Math.max(x0 - p.x, 0, p.x - x1), Math.max(z0 - p.z, 0, p.z - z1));
    if (d < bd) { bd = d; best = u; }
  }
  return bd < 3 ? best : null;
}
function hovered(h, x, y) {
  state.hovered = h?.unit || null;
  canvas.style.cursor = h ? 'pointer' : '';
  if (state.mode === 'obra') tower.setObraHover(h ? h.storey : -1);
  if (!h) return UI.hideTip();
  if (h.unit) UI.showTip(x, y, UI.unitTip(h.unit));
  else {
    const s = storeys[h.storey], d = tower.storeyStructDay(h.storey, sched);
    UI.showTip(x, y, `<b>${s.planta ? `${s.floor}º pavimento` : s.nome}</b> · laje em ${mesAno(d)}`);
  }
}
let down = null, moveQ = null;
const touches = new Set();
let multi = false;                       // gesto com 2+ dedos (pinça) nunca vira toque de seleção
canvas.addEventListener('pointerdown', (e) => {
  touches.add(e.pointerId);
  if (touches.size > 1) multi = true;
  down = { x: e.clientX, y: e.clientY, t: performance.now(), id: e.pointerId };
  tween = null;
});
canvas.addEventListener('pointermove', (e) => { if (e.pointerType === 'mouse') moveQ = [e.clientX, e.clientY]; });
canvas.addEventListener('pointerleave', (e) => { if (e.pointerType === 'mouse') hovered(null); });
const release = (e) => { touches.delete(e.pointerId); if (!touches.size) setTimeout(() => { if (!touches.size) multi = false; }, 0); };
canvas.addEventListener('pointercancel', (e) => { release(e); down = null; });
canvas.addEventListener('pointerup', (e) => {
  const d = down, wasMulti = multi;
  release(e);
  if (!d || d.id !== e.pointerId) return;
  down = null;
  if (wasMulti) return;
  const moved = Math.hypot(e.clientX - d.x, e.clientY - d.y), dt = performance.now() - d.t;
  if (moved > (e.pointerType === 'mouse' ? 6 : 12) || dt > 600) return;
  const h = pick(e.clientX, e.clientY);
  if (state.mode === 'obra') { if (h) { obraUI.stop(); obraUI.setDay(tower.storeyStructDay(h.storey, sched)); } return; }
  if (h?.unit) select(h.unit);
});
// iOS Safari ignora user-scalable=no: bloqueia o zoom da página por gesto e duplo toque
for (const ev of ['gesturestart', 'gesturechange']) document.addEventListener(ev, (e) => e.preventDefault(), { passive: false });
let lastTap = 0;
document.addEventListener('touchend', (e) => { const n = Date.now(); if (n - lastTap < 300 && !e.target.closest('button, input, summary, a')) e.preventDefault(); lastTap = n; }, { passive: false });
addEventListener('keydown', (e) => { if (e.key === 'Escape' && state.selected) select(null); });

/* ---------- controles ---------- */
document.getElementById('tab-com').onclick = () => state.mode !== 'com' && setMode('com');
document.getElementById('tab-obra').onclick = () => state.mode !== 'obra' && setMode('obra');
document.getElementById('mode-night').onclick = () => setNight(true);
document.getElementById('mode-day').onclick = () => setNight(false);
document.getElementById('views').onclick = (e) => { const b = e.target.closest('[data-view]'); if (b) setView(b.dataset.view); };
document.getElementById('t-avail').onclick = () => setContour(!state.contour);
document.getElementById('t-rotate').onclick = () => setRotate(!controls.autoRotate);
UI.initSummary(units, stats, (id) => select(byId.get(id)));

/* ---------- resize ---------- */
function resize() {
  camera.aspect = vw() / vh(); camera.updateProjectionMatrix();
  renderer.setSize(vw(), vh()); composer.setSize(vw(), vh()); bloom.resolution.set(vw(), vh());
}
addEventListener('resize', resize);

/* ---------- loop ---------- */
setNight(state.night);
const clock = new THREE.Clock();
let frames = 0, simMs = 0;
const tgtMin = new THREE.Vector3(-90, 2, -90), tgtMax = new THREE.Vector3(90, H + 10, 90);
function frame(dt) {
  simMs += dt * 1000;
  const t = simMs / 1000;
  if (tween) {
    tween.start ??= simMs;
    const k = Math.min(1, (simMs - tween.start) / tween.dur), e = ease(k);
    camera.position.lerpVectors(tween.p0, tween.p1, e); controls.target.lerpVectors(tween.t0, tween.t1, e);
    if (k >= 1) tween = null;
  }
  controls.target.clamp(tgtMin, tgtMax);
  controls.update(dt);
  if (!Number.isFinite(camera.position.x)) { const p = viewPose(state.view); camera.position.copy(p.pos); controls.target.copy(p.target); tween = null; }
  if (moveQ && !down) { const [x, y] = moveQ; moveQ = null; hovered(pick(x, y), x, y); }
  world.update(dt, t, camera);
  tower.update(t, state, dt);
  composer.render();
  if (++frames === 3) readyResolve();
}
function loop() { frame(Math.min(clock.getDelta(), .1)); requestAnimationFrame(loop); }
requestAnimationFrame(loop);
// sem quadros (aba oculta/prévia): garante que a abertura não trave esperando o 3D
setTimeout(() => { if (frames < 3) frame(.016), frame(.016), frame(.016); }, 1500);

introDone.then(() => {
  flyTo(viewPose('frente'), 3.2);
  const m = location.hash.match(/u=(\d+)/);
  if (m && byId.get(m[1])) setTimeout(() => select(byId.get(m[1])), 3300);
  else UI.setHint(touch ? 'Toque em uma unidade na fachada' : 'Clique em uma unidade na fachada');
});

window.ESPELHO3D = { units, storeys, sched, select: (id) => select(byId.get(String(id))), setMode, setNight, setView, setContour, camera, controls,
  advance(sec = 1, fps = 30) { for (let i = 0; i < sec * fps; i++) frame(1 / fps); } };
