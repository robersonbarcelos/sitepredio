/* Camada de dados: lê a configuração + tabela e entrega estruturas prontas para a cena e a UI. */

export const CFG = window.EMPREENDIMENTO;
export const TAB = window.TABELA;

export const STATUS = {
  d: { rotulo: 'Disponível', lit: false },
  v: { rotulo: 'Vendida', lit: true },
  r: { rotulo: 'Reservada', lit: true },
  x: { rotulo: 'Fora da tabela', lit: true },
};

/* ---------- formatação pt-BR ---------- */
const nf2 = new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const nf1 = new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
const nf0 = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 0 });
export const brl = (v) => 'R$ ' + nf2.format(v);
export const num2 = (v) => nf2.format(v);
export const num1 = (v) => nf1.format(v);
export const num0 = (v) => nf0.format(v);
export const MESES = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
export const MES3 = MESES.map((m) => m.slice(0, 3));

/* ---------- datas como "dia absoluto" (inteiro) ---------- */
const DAY = 86400000;
export const toDay = (iso) => Math.floor(Date.parse(iso + 'T12:00:00Z') / DAY);
export const dayDate = (d) => new Date(d * DAY + DAY / 2);
export const fmtDia = (iso) => iso.split('-').reverse().join('/');
export const mesAno = (d) => { const t = dayDate(d); return `${MESES[t.getUTCMonth()]} de ${t.getUTCFullYear()}`; };
export const mesesEntre = (a, b) => {
  const ta = dayDate(a), tb = dayDate(b);
  return Math.max(0, (tb.getUTCFullYear() - ta.getUTCFullYear()) * 12 + tb.getUTCMonth() - ta.getUTCMonth());
};

/* ---------- pavimentos (storeys) ----------
   Lista única, de baixo para cima, usada pela cena comercial e pela obra. */
export function buildStoreys(cfg = CFG) {
  const t = cfg.torre;
  const out = [];
  let y = 0;
  for (const n of t.podio.niveis) {
    out.push({ kind: n.tipo, nome: n.nome, curto: n.curto, y, h: n.altura, w: t.podio.largura, d: t.podio.profundidade });
    y += n.altura;
  }
  if (t.lazer) {
    out.push({ kind: 'lazer', nome: t.lazer.nome, curto: t.lazer.curto, y, h: t.lazer.altura, w: t.largura, d: t.profundidade });
    y += t.lazer.altura;
  }
  const floors = [];
  for (const p of cfg.plantas) for (let f = p.pavimentos[0]; f <= p.pavimentos[1]; f++) floors.push({ f, p });
  floors.sort((a, b) => a.f - b.f);
  for (const { f, p } of floors) {
    out.push({ kind: p.id === 'tipo' ? 'tipo' : 'planta', planta: p, floor: f, nome: `${f}º pavimento`, curto: `${f}º`, y, h: p.altura, w: t.largura, d: t.profundidade });
    y += p.altura;
  }
  if (t.atico) {
    out.push({ kind: 'atico', nome: t.atico.nome, curto: t.atico.curto, y, h: t.atico.altura, w: t.atico.largura, d: t.atico.profundidade });
    y += t.atico.altura;
  }
  out.top = y;
  return out;
}

/* ---------- unidades ---------- */
export function buildUnits(cfg = CFG, tab = TAB, storeys = buildStoreys(cfg)) {
  const rows = new Map(tab.unidades.map((r) => [r[0], r]));
  const units = [];
  for (const s of storeys) {
    if (!s.planta) continue;
    for (const pu of s.planta.unidades) {
      const id = `${s.floor}${pu.final}`;
      const row = rows.get(id) || [id, 'v', null, null];
      const valor = row[2];
      units.push({
        id, floor: s.floor, final: pu.final, planta: s.planta, storey: s,
        tipologia: pu.tipologia, tip: cfg.tipologias[pu.tipologia] || { nome: pu.tipologia, curto: pu.tipologia },
        area: pu.area, desc: pu.desc, rect: pu.rect, sacada: pu.sacada || null,
        status: row[1], vaga: row[3], valor,
        fluxo: valor ? cfg.pagamento.map((p) => ({ ...p, valor: (valor * p.pct) / 100 / (p.n || 1) })) : null,
        cota: s.y,
      });
    }
  }
  units.sort((a, b) => a.floor - b.floor || a.final.localeCompare(b.final));
  return units;
}

export function salesStats(units) {
  const sold = units.filter((u) => u.status === 'v' || u.status === 'x').length;
  return { sold, total: units.length, pct: (sold / units.length) * 100, avail: units.filter((u) => u.status === 'd').length };
}

/* ---------- cronograma ---------- */
export function buildSchedule(cfg = CFG, storeys) {
  const o = cfg.obra;
  const etapas = o.etapas.map((e) => {
    const periodos = e.periodos.map(([a, b]) => [toDay(a), toDay(b)]);
    const total = periodos.reduce((s, [a, b]) => s + (b - a), 0);
    return { ...e, periodos, total };
  });
  return {
    inicio: toDay(o.inicio), entrega: toDay(o.entrega), realAte: toDay(o.realAte),
    etapas, n: storeys.length,
  };
}

/* progresso 0..1 de uma etapa em um dia */
export function progress(et, day) {
  let done = 0;
  for (const [a, b] of et.periodos) done += Math.min(Math.max(day - a, 0), b - a);
  return et.total ? done / et.total : 0;
}

/* quantos pavimentos já concluídos nesta etapa */
export const levelsDone = (et, day, n) => Math.floor(progress(et, day) * n + 1e-6);

/* o pavimento i (0 = mais baixo) está concluído nesta etapa? */
export function levelDone(et, day, i, n) {
  const k = levelsDone(et, day, n);
  return et.sentido === 'desce' ? i >= n - k : i < k;
}

/* dia em que o pavimento i fica pronto na etapa */
export function levelDay(et, i, n) {
  const idx = et.sentido === 'desce' ? n - 1 - i : i;
  let target = ((idx + 1) / n) * et.total;
  for (const [a, b] of et.periodos) {
    if (target <= b - a) return Math.round(a + target);
    target -= b - a;
  }
  return et.periodos.at(-1)[1];
}
