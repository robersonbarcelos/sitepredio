/* Interface comercial: header, resumo, espelho, card da unidade, tooltip, dica e abertura. */
import { CFG, TAB, STATUS, brl, num0, num1, num2, fmtDia, mesAno, toDay } from './data.js';

const $ = (s) => document.querySelector(s);
const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

/* ---------- header ---------- */
export function initBrand() {
  const inc = CFG.incorporadora;
  $('#brand-mark').innerHTML = inc.logo ? `<img src="${esc(inc.logo)}" alt="${esc(inc.nome)}">` : esc(inc.sigla || inc.nome);
  $('#brand-name').textContent = CFG.produto.nome;
  document.title = `${CFG.produto.nomeCompleto || CFG.produto.nome} · Espelho de vendas 3D`;
}
export function setBrandSub(mode, units) {
  $('#brand-sub').textContent = mode === 'obra'
    ? `${CFG.produto.cidade} · obra · entrega prevista em ${mesAno(toDay(CFG.obra.entrega))}`
    : `${CFG.produto.cidade} · ${units.length} unidades · tabela de ${fmtDia(TAB.data)}`;
}

/* ---------- dica ---------- */
let hintTimer;
export function setHint(text, { top = false, autoHide = 0 } = {}) {
  const h = $('#hint');
  clearTimeout(hintTimer);
  if (!text) { h.classList.add('off'); return; }
  h.textContent = text; h.classList.toggle('top', top); h.classList.remove('off');
  if (autoHide) hintTimer = setTimeout(() => h.classList.add('off'), autoHide);
}

/* ---------- resumo + espelho ---------- */
export function initSummary(units, stats, onPick) {
  $('#s-pct').textContent = num1(stats.pct) + '%';
  requestAnimationFrame(() => ($('#s-bar').style.width = stats.pct.toFixed(2) + '%'));
  const finals = [...new Set(units.map((u) => u.final))].sort();
  const floors = [...new Set(units.map((u) => u.floor))].sort((a, b) => b - a);
  const byKey = new Map(units.map((u) => [`${u.floor}-${u.final}`, u]));
  const m = $('#mirror');
  m.style.gridTemplateColumns = `28px repeat(${finals.length}, minmax(0, 1fr))`;
  let html = '<span></span>' + finals.map((f) => `<span class="hd">${f}</span>`).join('');
  for (const fl of floors) {
    html += `<span class="fl">${fl}º</span>`;
    for (const f of finals) {
      const u = byKey.get(`${fl}-${f}`);
      html += u ? `<button class="${u.status}" data-id="${u.id}" title="${u.id} · ${esc(u.tip.nome)} · ${STATUS[u.status].rotulo}">${f}</button>` : '<span></span>';
    }
  }
  m.innerHTML = html;
  m.addEventListener('click', (e) => { const b = e.target.closest('button[data-id]'); if (b) onPick(b.dataset.id); });
  $('#mirror-foot').textContent = TAB.nota || '';
  if (!TAB.nota) $('#mirror-foot').remove();
}
export function markMirror(id) {
  document.querySelectorAll('#mirror button.sel').forEach((b) => b.classList.remove('sel'));
  if (id) document.querySelector(`#mirror button[data-id="${id}"]`)?.classList.add('sel');
}

/* ---------- card ---------- */
export function showCard(u, units, { onClose, onNav }) {
  const card = $('#card');
  if (!u) { card.classList.add('hide-anim'); card.setAttribute('aria-hidden', 'true'); return; }
  const st = STATUS[u.status];
  const sale = (u.status === 'd' || u.status === 'r') && u.valor;
  const wa = CFG.contato?.whatsapp && u.status === 'd'
    ? `<a class="cta" target="_blank" rel="noopener" href="https://wa.me/${CFG.contato.whatsapp}?text=${encodeURIComponent((CFG.contato.mensagem || '').replace('{id}', u.id).replace('{produto}', CFG.produto.nomeCompleto || CFG.produto.nome))}">Tenho interesse nesta unidade</a>` : '';
  card.innerHTML = `
    <button class="close" aria-label="Fechar">×</button>
    <p class="eyebrow">${esc(u.planta.rotulo || 'Apartamento')} · final ${u.final}</p>
    <div class="unit-head"><h2>${u.id}</h2><span class="pill ${u.status}">${st.rotulo}</span></div>
    <p class="desc">${esc(u.desc)}</p>
    <dl class="facts">
      <div><dt>Área privativa</dt><dd>${num2(u.area)} m²</dd></div>
      <div><dt>Pavimento</dt><dd>${u.floor}º<small>cota +${num2(u.cota)} m</small></dd></div>
      <div><dt>Vaga</dt><dd>${esc(u.vaga || '·')}</dd></div>
    </dl>
    ${sale ? `
    <section class="price">
      <p class="price-l">Valor de tabela</p>
      <p class="price-v">${brl(u.valor)}</p>
      <p class="m2">R$ ${num0(u.valor / u.area)} por m² privativo</p>
      <table class="flow"><tbody>
        ${u.fluxo.map((p) => `<tr><td>${p.n ? `${p.n} ${esc(p.rotulo)}` : esc(p.rotulo)} · ${p.pct}%</td><td>${brl(p.valor)}</td></tr>`).join('')}
      </tbody></table>
      <p class="note">${esc(CFG.notaPagamento || '')}</p>
    </section>` : `<p class="sold-msg">${u.status === 'x' ? esc(TAB.nota || 'Unidade fora da tabela de vendas.') : u.status === 'r' ? 'Unidade reservada no momento.' : 'Unidade vendida. Use os botões abaixo para ver as disponíveis.'}</p>`}
    <div class="card-nav">
      <button data-nav="-1">‹ Disponível anterior</button>
      <button data-nav="1">Próxima disponível ›</button>
    </div>${wa}`;
  card.querySelector('.close').onclick = onClose;
  card.querySelectorAll('[data-nav]').forEach((b) => (b.onclick = () => onNav(+b.dataset.nav)));
  card.classList.remove('hide-anim'); card.setAttribute('aria-hidden', 'false'); card.scrollTop = 0;
}
export function nextAvailable(units, from, dir) {
  const av = units.filter((u) => u.status === 'd');
  if (!av.length) return null;
  const order = (u) => u.floor * 100 + parseInt(u.final, 10);
  const k = from ? order(from) : -Infinity;
  if (dir > 0) return av.find((u) => order(u) > k) || av[0];
  return [...av].reverse().find((u) => order(u) < k) || av.at(-1);
}

/* ---------- tooltip ---------- */
const tip = () => $('#tip');
export function showTip(x, y, html) { const t = tip(); t.innerHTML = html; t.style.left = x + 'px'; t.style.top = y + 'px'; t.classList.add('on'); }
export function hideTip() { tip().classList.remove('on'); }
export const unitTip = (u) => `<b>${u.id}</b> · ${esc(u.tip.curto)} · ${num2(u.area)} m² · <span class="s-${u.status}">${STATUS[u.status].rotulo}</span>`;

/* ---------- abertura (logo enchendo até o % vendido) ---------- */
export function runIntro(stats, ready) {
  const intro = $('#intro');
  const name = CFG.produto.nome;
  $('#intro-lbl').textContent = `vendido · ${stats.sold} de ${stats.total} unidades`;
  $('#intro-mark').textContent = CFG.incorporadora.sigla || CFG.incorporadora.nome;
  const style = 'font-family:"Cormorant Garamond",Georgia,serif;font-weight:500;font-size:240px;letter-spacing:12px';
  for (const id of ['intro-clip', 'intro-outline']) { const t = document.getElementById(id); t.textContent = name; t.setAttribute('style', style); }
  const svg = $('#intro-svg'), front = $('#liq-f'), back = $('#liq-b');
  let bb = { x: 0, y: 40, width: 1000, height: 220 };

  let skip = false, done = false, resolveFn;
  const finished = new Promise((r) => (resolveFn = r));
  $('#intro-skip').onclick = () => { skip = true; };
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) skip = true;

  document.fonts.ready.then(() => {
    try {
      const b = document.getElementById('intro-outline').getBBox();
      if (b.width) { bb = b; svg.setAttribute('viewBox', `${b.x - 20} ${b.y - 10} ${b.width + 40} ${b.height + 20}`); }
    } catch { /* sem bbox: usa o padrão */ }
  });

  const target = stats.pct / 100, FILL = 2400, DELAY = 350;
  const t0 = performance.now();
  let isReady = false;
  ready.then(() => { isReady = true; $('#intro-status').textContent = ''; });

  const wave = (level, amp, ph, k) => {
    const x0 = bb.x - 30, x1 = bb.x + bb.width + 30, y = bb.y + bb.height * (1 - level), yb = bb.y + bb.height + 40;
    let d = `M${x0},${yb} L${x0},${y}`;
    for (let x = x0; x <= x1; x += 12) d += ` L${x.toFixed(1)},${(y + Math.sin(x * k + ph) * amp).toFixed(2)}`;
    return d + ` L${x1},${yb} Z`;
  };
  function frame(now) {
    if (done) return;
    if (!intro.isConnected) { done = true; resolveFn(); return; }
    const k =Math.min(1, Math.max(0, (now - t0 - DELAY) / FILL));
    const e = skip ? 1 : 1 - Math.pow(1 - k, 3);
    const lvl = target * e, amp = lvl <= .0005 ? 0 : 4 + 10 * (1 - e);
    front.setAttribute('d', wave(lvl, amp, now * .0034, .021));
    back.setAttribute('d', wave(Math.min(1, lvl + .012), amp * .8, -now * .0026 + 1.7, .017));
    $('#intro-num').textContent = num1(stats.pct * e);
    if ((k >= 1 || skip) && isReady) {
      done = true;
      setTimeout(() => { intro.classList.add('out'); resolveFn(); setTimeout(() => intro.remove(), 1000); }, skip ? 0 : 450);
      return;
    }
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
  return finished;
}
