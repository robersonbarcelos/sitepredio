/* Painel da obra: linha do tempo compacta, Gantt por etapa, KPIs e reprodução. */
import { CFG, MES3, MESES, dayDate, mesesEntre, progress, levelsDone } from './data.js';

const $ = (s) => document.querySelector(s);

export function initObraUI(sched, storeys, tower) {
  const panel = $('#obra');
  const { inicio, entrega, realAte } = sched;
  const span = entrega - inicio;
  const pct = (d) => (((d - inicio) / span) * 100).toFixed(3) + '%';
  const today = Math.min(entrega, Math.max(inicio, realAte));
  let day = today, playing = false, raf = 0;

  /* ---------- eixo de meses ---------- */
  const months = [];
  { const t = dayDate(inicio); let y = t.getUTCFullYear(), m = t.getUTCMonth();
    for (;;) { const d = Math.round(Date.UTC(y, m, 1, 12) / 86400000); if (d > entrega) break; if (d >= inicio) months.push({ d, y, m }); if (++m > 11) { m = 0; y++; } } }
  const yy = (y) => String(y).slice(2);

  /* compacta */
  const mini = $('#ob-mini');
  const first = dayDate(inicio), last = dayDate(entrega);
  let mh = `<span class="ax first" style="left:0">${MES3[first.getUTCMonth()]}/${yy(first.getUTCFullYear())}</span>`;
  for (const mo of months) if (mo.m === 0) {
    const p = (mo.d - inicio) / span;
    mh += `<span class="tick" style="left:${pct(mo.d)}"></span>`;
    if (p > .08 && p < .9) mh += `<span class="ax" style="left:${pct(mo.d)}">jan/${yy(mo.y)}</span>`;
  }
  mh += `<span class="ax last" style="left:100%">${MES3[last.getUTCMonth()]}/${yy(last.getUTCFullYear())}</span><span class="td" style="left:${pct(today)}" title="hoje"></span>`;
  mini.insertAdjacentHTML('beforeend', mh);

  /* Gantt */
  const chart = $('#ob-chart');
  let ch = '';
  sched.etapas.forEach((e, i) => {
    const row = `grid-row:${i + 1}`;
    ch += `<span class="ob-lbl" style="${row};grid-column:1">${e.nome}</span><div class="ob-track" style="${row};grid-column:2">`;
    ch += e.periodos.map(([a, b]) => `<span class="ob-seg" style="left:${pct(a)};width:${(((b - a) / span) * 100).toFixed(3)}%;background:${e.cor}"></span>`).join('');
    ch += e.periodos.map(([a], k) => `<span class="ob-fill" data-e="${i}" data-k="${k}" style="left:${pct(a)};background:${e.cor}"></span>`).join('');
    ch += `</div><span class="ob-pct" id="ob-pct-${i}" style="${row};grid-column:3">0%</span>`;
  });
  ch += `<div class="ob-axis" style="grid-row:${sched.etapas.length + 1}">` + months.filter((mo) => mo.m % 3 === 0 || mo === months[0]).map((mo, k) =>
    `<span style="left:${pct(mo.d)}">${mo.m === 0 || k === 0 ? `${MES3[mo.m]}/${yy(mo.y)}` : MES3[mo.m]}</span>`).join('') + '</div>';
  ch += `<div class="ob-overlay" style="grid-row:1 / span ${sched.etapas.length}">
    <span class="today" style="left:${pct(today)}"><b>HOJE</b></span><span class="cur" id="ob-cur"></span>
    <input type="range" class="scrub" id="ob-range" aria-label="Linha do tempo da obra (Gantt)"></div>`;
  chart.innerHTML = ch;
  $('#ob-foot').textContent = CFG.obra.notaReal || '';

  for (const r of [$('#obc-range'), $('#ob-range')]) {
    Object.assign(r, { min: inicio, max: entrega, step: 1, value: day });
    r.addEventListener('input', () => { stop(); setDay(+r.value); });
  }

  /* ---------- texto de frente de obra ---------- */
  const n = storeys.length;
  const onde = (s) => (s.planta ? `no ${s.floor}º pavimento` : `no ${s.curto}`);
  function frente(d) {
    if (d < inicio) return `Início das obras em ${MESES[first.getUTCMonth()]} de ${first.getUTCFullYear()}`;
    const parts = [];
    for (const e of sched.etapas) {
      const p = progress(e, d);
      if (p <= 0 || p >= 1) continue;
      if (e.tipo === 'pavimentos') {
        const k = levelsDone(e, d, n), idx = e.sentido === 'desce' ? n - 1 - k : k;
        parts.push(`${e.nome.toLowerCase()} ${onde(storeys[Math.min(n - 1, Math.max(0, idx))])}`);
      } else parts.push(`${e.nome.toLowerCase()} em andamento`);
    }
    if (!parts.length) return sched.etapas.every((e) => progress(e, d) >= 1) ? 'Obra concluída e entregue' : 'Preparação da próxima etapa';
    const s = parts.slice(0, 3).join(' · ');
    return s[0].toUpperCase() + s.slice(1);
  }

  /* ---------- aplicar dia ---------- */
  function setDay(d) {
    day = Math.round(Math.min(entrega, Math.max(inicio, d)));
    const t = dayDate(day), real = day <= realAte;
    const label = `${MESES[t.getUTCMonth()][0].toUpperCase() + MESES[t.getUTCMonth()].slice(1)} de ${t.getUTCFullYear()}<em class="${real ? 'real' : ''}">${real ? 'situação real' : 'projeção'}</em>`;
    const now = frente(day);
    panel.querySelectorAll('[data-ob=date]').forEach((e) => (e.innerHTML = label));
    panel.querySelectorAll('[data-ob=now]').forEach((e) => (e.textContent = now));
    $('#obc-fill').style.width = pct(day);
    $('#ob-cur').style.left = pct(day);
    for (const r of [$('#obc-range'), $('#ob-range')]) if (+r.value !== day) r.value = day;
    sched.etapas.forEach((e, i) => {
      $(`#ob-pct-${i}`).textContent = Math.round(progress(e, day) * 100) + '%';
      e.periodos.forEach(([a, b], k) => {
        const el = chart.querySelector(`.ob-fill[data-e="${i}"][data-k="${k}"]`);
        el.style.width = ((Math.min(Math.max(day - a, 0), b - a) / span) * 100).toFixed(3) + '%';
      });
    });
    const { kS } = tower.applyObra(day, sched);
    $('#ob-lajes').textContent = `${kS} de ${n}`;
    const m = mesesEntre(day, entrega);
    $('#ob-meses').textContent = day >= entrega ? 'entregue' : `${m} ${m === 1 ? 'mês' : 'meses'}`;
  }

  /* ---------- reprodução ---------- */
  const playBtns = panel.querySelectorAll('[data-act=play]');
  function paintPlay() { playBtns.forEach((b) => { b.textContent = b.dataset.label ? (playing ? 'Pausar' : 'Reproduzir') : playing ? '❚❚' : '▶'; b.setAttribute('aria-label', playing ? 'Pausar' : 'Reproduzir'); }); }
  function stop() { playing = false; cancelAnimationFrame(raf); paintPlay(); }
  function play() {
    if (day >= entrega) setDay(inicio);
    playing = true; paintPlay();
    let last = performance.now();
    const step = (now) => {
      if (!playing) return;
      const dt = Math.min(.1, (now - last) / 1000); last = now;
      setDay(day + dt * Math.max(40, span / 14));
      if (day >= entrega) return stop();
      raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
  }
  panel.addEventListener('click', (e) => {
    const a = e.target.closest('[data-act]')?.dataset.act;
    if (a === 'today') { stop(); setDay(today); }
    if (a === 'end') { stop(); setDay(entrega); }
    if (a === 'play') playing ? stop() : play();
    if (a === 'expand') panel.classList.toggle('compact');
  });

  return {
    setDay, stop,
    get day() { return day; },
    show() { panel.classList.remove('hide'); setDay(day); },
    hide() { stop(); panel.classList.add('hide'); },
  };
}
