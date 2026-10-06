# Espelho de Vendas 3D (template)

Espelho de vendas interativo em 3D para incorporadoras e imobiliárias: a torre do empreendimento aparece numa cidade procedural, as unidades vendidas ficam com a luz acesa, o corretor clica numa janela e vê área, pavimento, vaga, valor de tabela e fluxo de pagamento. O modo **Obra** mostra a torre sendo construída mês a mês, com cronograma em Gantt.

Implementação própria, marca neutra, dados fictícios (Residencial Aurora). Inspirado no conceito de um espelho 3D público, sem reaproveitar código de terceiros.

## Rodar localmente

Precisa de um servidor HTTP (módulos ES não abrem via `file://`):

```bash
python -m http.server 8777
```

Abra http://localhost:8777. Para abrir direto numa unidade: `http://localhost:8777/#u=1203`.

## Estrutura

```
index.html               interface (HTML + CSS, tokens no :root)
data/empreendimento.js   CONFIGURAÇÃO do empreendimento (muda 1 vez por projeto)
data/tabela.js           status e preço das unidades (gerado a partir do CSV)
data/tabela-demo.csv     planilha de exemplo
js/main.js               renderer, pós-processamento, câmera, seleção, modos
js/world.js              céu, montanhas, mar, cidade, árvores, postes, trânsito
js/tower.js              torre comercial (unidades clicáveis) + torre de obra
js/ui.js                 header, resumo, espelho, card, tooltip, abertura
js/obra-ui.js            linha do tempo, Gantt, KPIs da obra
js/data.js               normalização de dados, cronograma, formatação pt-BR
tools/csv-para-tabela.mjs  CSV da incorporadora → data/tabela.js
tools/gerar-csv-demo.mjs   gera planilha fictícia (só demonstração)
docs/PRD.md              produto: requisitos, regras, roadmap, oferta
docs/FLUXO.md            fluxos do usuário e operação (onboarding, atualização, deploy)
docs/research/           levantamento da referência (comportamentos, topologia, specs)
docs/design-references/  capturas da referência e do clone
```

## Novo empreendimento em 6 passos

1. Duplique a pasta do projeto.
2. Edite `data/empreendimento.js`: nome, cidade, cores, volumetria (largura, profundidade, pódio, alturas), plantas (finais, áreas, retângulos), condição de pagamento e cronograma.
3. Monte a planilha `tabela.csv` (`unidade;status;valor;vaga`) e rode:
   ```bash
   node tools/csv-para-tabela.mjs data/tabela.csv 2026-09-28 "Observação de rodapé"
   ```
4. Rode localmente e confira: cada unidade precisa ter janela na fachada (o console avisa se alguma ficou sem).
5. Faça o checklist de QA em `docs/FLUXO.md`.
6. Publique a pasta como site estático (Vercel, Netlify, Cloudflare Pages).

## Deploy na Vercel

1. Em vercel.com → **Add New → Project** → importe o repositório `sitepredio`.
2. Framework Preset: **Other**. Build Command: vazio. Output Directory: vazio (raiz). Install Command: vazio.
3. Deploy. O `index.html` da raiz é a página inicial; `vercel.json` já define `no-cache` para `/data/*` (tabela sempre atualizada).
4. A cada `git push` na `main`, a Vercel publica de novo sozinha.

## Atualização semanal da tabela

Edite o CSV → rode o comando do passo 3 → publique. Nenhum outro arquivo muda.

## Tecnologia

Three.js r160 (via CDN, importmap), sem build, sem backend. Pós-processamento: MSAA, bloom, color grading com vinheta. Céu físico (Preetham) de dia e domo estrelado à noite, reflexos via PMREM.

## Depuração

`window.ESPELHO3D` expõe `select(id)`, `setMode('obra'|'com')`, `setNight(bool)`, `setView(nome)`, `setContour(bool)` e `advance(segundos)` (avança quadros sem depender do navegador, útil em QA automatizado).
