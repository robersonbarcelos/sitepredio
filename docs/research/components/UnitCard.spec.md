# UnitCard Specification
- **Arquivo:** `index.html` aside#card · `js/ui.js` showCard
- **Referência:** `02-card-unidade.jpg` · clone: `clone-02-card-unidade.jpg`
- **Interaction model:** click-driven
## Estilos
- painel 342px, top 140px, right 16px, padding 18px 18px 16px; entrada opacity + translateX(16px) .3s
- eyebrow 11px caixa alta tracking .12em; número Cormorant 600 52px; pílula 12px/600 raio 999px (d azul, v/x dourado, r âmbar)
- descrição Cormorant itálico 500 18px
- fatos: grid 3 colunas; dt 10.5px caixa alta #958571; dd 14px/600; cota 11px
- valor: rótulo 11px; valor Cormorant 600 30px; R$/m² 12px #c2b19c
- fluxo: tabela 13px, linhas com borda superior, valor à direita 600
- nota 11.5px #958571; navegação 2 colunas, botões 12px/500 padding 9px 8px raio 9px
## Estados
- disponível/reservada com valor: bloco de preço; vendida/fora: mensagem; botão WhatsApp só se configurado
## Responsivo
- ≤760px: painel inferior largura total, raio 18px no topo, max-height 74vh, safe-area
