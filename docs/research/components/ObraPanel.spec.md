# ObraPanel Specification
- **Arquivo:** `index.html` section#obra · `js/obra-ui.js`
- **Referência:** `03-obra-compacto.jpg`, `04-obra-expandido-abr28.jpg` · clone: `clone-03`, `clone-04`
- **Interaction model:** drag (range) + click + time-driven (reproduzir)
## Compacto
- grid: [250–320px data/frase] [1fr mini linha do tempo] [botões]
- data: Cormorant 600 22px + selo 10px caixa alta (#a9cde4 real, #d39a5e projeção)
- trilho 3px rgba(239,228,212,.16), preenchimento #c9b9a0 → #efe4d4, marcos de ano, marcador hoje azul
## Expandido
- cabeçalho: data/frase · KPIs (dt 10px caixa alta, dd Cormorant 24px) · Hoje/Reproduzir/Entrega/Recolher
- Gantt: grid 120px | 1fr | 46px; barras 6px raio 3px; período a 22% de opacidade, preenchimento até o cursor
- cores: Estrutura #aba69e · Alvenaria #c56c4b · Fachada #ddb19a · Esquadrias #8fbad3 · Acabamentos #d39a5e · Lazer #8fab6b · Entrega #efe4d4
- sobreposição: linha HOJE tracejada azul, cursor 2px com bolinha 12px, input range transparente cobrindo os trilhos
## Reprodução
- velocidade: max(40, duração/14) dias por segundo; para no fim
