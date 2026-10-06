#!/usr/bin/env node
/* Gera uma planilha FICTÍCIA (data/tabela-demo.csv) a partir das plantas de data/empreendimento.js.
 * Serve só para demonstração do template. Em produção, a planilha vem da incorporadora.
 *   node tools/gerar-csv-demo.mjs
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const ctx = { window: {} };
vm.runInNewContext(readFileSync(resolve(root, 'data/empreendimento.js'), 'utf8'), ctx);
const cfg = ctx.window.EMPREENDIMENTO;

let s = 1234567;
const rnd = () => ((s = (s * 16807) % 2147483647) / 2147483647);

const m2 = { studio: 12400, '1s1q': 11300, '2s': 11500, loft: 13200 };
const vagas = { studio: ['Sem vaga', 'Simples', 'Simples'], '1s1q': ['Simples', 'Simples', 'Dupla'], '2s': ['Dupla'], loft: ['Simples', 'Dupla'] };
const linhas = ['unidade;status;valor;vaga'];

for (const p of cfg.plantas) {
  for (let f = p.pavimentos[0]; f <= p.pavimentos[1]; f++) {
    for (const u of p.unidades) {
      const id = `${f}${u.final}`;
      const vaga = vagas[u.tipologia][Math.floor(rnd() * vagas[u.tipologia].length)];
      let status;
      if (f === p.pavimentos[0] && p.id === 'tipo') status = 'fora';          // permutas no 1º tipo
      else status = rnd() < 0.62 + (14 - f) * 0.02 ? 'vendida' : 'disponivel';
      if (status === 'disponivel' && rnd() < 0.08) status = 'reservada';
      const base = u.area * m2[u.tipologia] * (1 + (f - 4) * 0.011) * (0.98 + rnd() * 0.04);
      const valor = status === 'fora' ? '' : base.toFixed(2).replace('.', ',');
      linhas.push(`${id};${status};${valor};${vaga}`);
    }
  }
}
writeFileSync(resolve(root, 'data/tabela-demo.csv'), linhas.join('\n') + '\n');
console.log(`data/tabela-demo.csv: ${linhas.length - 1} unidades`);
