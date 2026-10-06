# Controls Specification
- **Arquivo:** `index.html` nav.controls · `js/main.js`
- **Interaction model:** click-driven
## Estilos
- container: painel padrão, padding 8px, gap 8px, flex-wrap, alinhado à direita
- abas (.tabs): fundo rgba(0,0,0,.32), padding 3px, raio 10px; botão 12px/600, caixa alta, tracking .08em, padding 7px 14px, raio 8px; ativo fundo #d39a5e texto #24170e
- segmentos (.seg): fundo rgba(0,0,0,.22); botão 12.5px/500 padding 7px 12px; ativo rgba(48,37,30,.94) + inset 1px rgba(239,228,212,.14)
- chips: padding 10px 12px, raio 10px; ponto 7px #958571; ativo inset 1px rgba(211,154,94,.55) e ponto #d39a5e com glow
## Estados
- COMERCIAL/OBRA, Noite/Dia, Frente/Lateral/Fundos/Rooftop (aria-pressed), Contornar disponíveis (some no modo obra), Girar (ligado por padrão)
## Responsivo
- ≤1100px: desce para top 80px; ≤760px: uma linha com rolagem horizontal, sem barra
