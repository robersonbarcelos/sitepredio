#!/usr/bin/env node
/* Converte a planilha de vendas (CSV) em data/tabela.js.
 *
 * Uso:
 *   node tools/csv-para-tabela.mjs <arquivo.csv> <data-da-tabela AAAA-MM-DD> ["nota de rodapé"]
 *
 * Colunas do CSV (separador ; ou ,  primeira linha = cabeçalho):
 *   unidade ; status ; valor ; vaga
 *   1203    ; disponivel ; 612.430,55 ; Simples
 *
 * status aceita: disponivel | vendida | reservada | fora  (ou d | v | r | x)
 * valor aceita formato brasileiro (612.430,55) ou ponto decimal (612430.55). Vazio = sem preço.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const [, , csvPath, dataTabela, nota = ''] = process.argv;
if (!csvPath || !/^\d{4}-\d{2}-\d{2}$/.test(dataTabela || '')) {
  console.error('Uso: node tools/csv-para-tabela.mjs <arquivo.csv> <AAAA-MM-DD> ["nota"]');
  process.exit(1);
}

const STATUS = { d: 'd', disponivel: 'd', 'disponível': 'd', v: 'v', vendida: 'v', vendido: 'v',
  r: 'r', reservada: 'r', reservado: 'r', x: 'x', fora: 'x', 'fora da tabela': 'x', permuta: 'x' };

const parseValor = (s) => {
  s = (s || '').replace(/[R$\s]/g, '');
  if (!s) return null;
  if (s.includes(',')) s = s.replace(/\./g, '').replace(',', '.');
  const n = Number(s);
  return Number.isFinite(n) ? Math.round(n * 100) / 100 : null;
};

const text = readFileSync(csvPath, 'utf8').replace(/^﻿/, '');
const lines = text.split(/\r?\n/).filter((l) => l.trim());
const sep = lines[0].includes(';') ? ';' : ',';
const rows = [];
const erros = [];

lines.slice(1).forEach((line, i) => {
  const [id, st, valor, vaga] = line.split(sep).map((c) => c.trim());
  const status = STATUS[(st || '').toLowerCase()];
  if (!/^\d{3,4}$/.test(id || '')) return erros.push(`linha ${i + 2}: unidade inválida "${id}"`);
  if (!status) return erros.push(`linha ${i + 2}: status inválido "${st}"`);
  const v = parseValor(valor);
  if (status === 'd' && v == null) erros.push(`linha ${i + 2}: unidade ${id} disponível sem valor`);
  rows.push([id, status, v, vaga || null]);
});

if (erros.length) {
  console.error('Corrija a planilha:\n  ' + erros.join('\n  '));
  process.exit(1);
}

const out = `/* Gerado por tools/csv-para-tabela.mjs em ${new Date().toISOString().slice(0, 10)}. Não edite à mão: edite o CSV e rode de novo. */
window.TABELA = {
  data: '${dataTabela}',
  nota: ${JSON.stringify(nota)},
  // [unidade, status (d disponível | v vendida | r reservada | x fora da tabela), valor, vaga]
  unidades: [
${rows.map((r) => '    ' + JSON.stringify(r)).join(',\n')}
  ],
};
`;
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
writeFileSync(resolve(root, 'data/tabela.js'), out);
const cont = rows.reduce((a, r) => ((a[r[1]] = (a[r[1]] || 0) + 1), a), {});
console.log(`data/tabela.js gerado: ${rows.length} unidades`, cont);
