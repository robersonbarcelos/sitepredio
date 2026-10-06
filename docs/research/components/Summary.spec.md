# Summary + Espelho Specification
- **Arquivo:** `index.html` aside#summary · `js/ui.js` initSummary/markMirror
- **Interaction model:** click-driven (details + células)
## Estilos
- painel 318px, padding 16px 16px 12px, bottom/left 16px
- % vendido: Cormorant 600 40px #f6c27a; rótulo 11px caixa alta tracking .09em #c2b19c
- barra 5px raio 3px, trilho rgba(169,205,228,.22), preenchimento #e7a95e → #f6c27a (transição 1.2s)
- legenda 12px: lit = #ffe2ad→#e9a252 + glow; dark = #1a2530 + inset rgba(169,205,228,.6)
- grade: colunas 28px + N × 1fr, gap 3px; cabeçalho 9.5px #958571; andar 10.5px
- células 21px raio 4px 9.5px/600: v #ffdca0→#e6a65a (texto #4a2c12) · x #e3c597→#bf9563 · r #f3c48a→#c98a4e · d rgba(18,26,34,.9) borda rgba(169,205,228,.5) texto #a9cde4 · sel anel 2px #f6c27a
- rodapé 11px #958571 (TABELA.nota)
## Ordem
- andares do mais alto para o mais baixo; finais 01..N (N = maior número de finais)
