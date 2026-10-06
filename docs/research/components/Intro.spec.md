# Intro (abertura) Specification
- **Arquivo:** `index.html` (#intro) + `js/ui.js` (runIntro)
- **Referência:** `docs/design-references/07-intro-abertura.jpg` · clone: `clone-07-intro.jpg`
- **Interaction model:** time-driven (+ clique em "Pular abertura")

## Estrutura
div#intro (fixed, z 50) > .intro-inner > svg (texto em contorno + clipPath com 2 ondas) + p.intro-pct + p.intro-lbl; p.intro-status; span.intro-mark; button.intro-skip

## Estilos (getComputedStyle na referência / aplicados)
- fundo: radial #231b16 → #17120f → #100c0a
- número: Cormorant Garamond 600 52px, #efe4d4; "%" 22px #f6c27a
- legenda: DM Sans 12px, caixa alta, tracking .16em, #c2b19c
- contorno do nome: stroke rgba(214,190,130,.55) 1.4px; líquido: gradiente #f1d892 → #a4843a; onda de fundo #7a6230 55%

## Comportamento
- atraso 350 ms, enchimento 2400 ms, easing 1-(1-k)^3, amplitude 4 + 10·(1-e), 2 ondas em fases opostas
- sai quando enchimento = 1 E cena pronta (3 quadros renderizados); fade .9 s; depois fly-in de 3,2 s
- viewBox recalculado pelo getBBox do texto (qualquer nome cabe)
