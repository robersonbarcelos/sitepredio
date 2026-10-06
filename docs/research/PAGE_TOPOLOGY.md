# PAGE TOPOLOGY: Espelho de Vendas 3D

Aplicação de tela única. Não existe rolagem de documento: tudo é sobreposto a um canvas WebGL fixo em tela cheia.

## Camadas (z-index, de baixo para cima)

| z | Elemento | Posição | Modelo de interação |
|---|---|---|---|
| 0 | `canvas#scene` | fixed, 100vw × 100vh | arrastar (órbita), roda (zoom), hover (tooltip), clique (seleção) |
| 10 | `header.brand` | top 16 / left 16 | estático (texto muda por modo) |
| 10 | `nav.controls` | top 16 / right 16 | click-driven (abas, segmentos, chips) |
| 10 | `p#hint` | rodapé centro (comercial) ou topo esquerdo (obra) | time-driven (some ao selecionar) |
| 10 | `aside#summary` | bottom 16 / left 16 (só comercial) | click-driven (`<details>` + células) |
| 10 | `section#obra` | bottom 16 / left 16 / right 16 (só obra) | drag (range), click (Hoje, Play, Etapas), time-driven (play) |
| 20 | `aside#card` | top 140 / right 16 (mobile: painel inferior) | click-driven (fechar, anterior, próxima) |
| 30 | `div#tip` | segue o cursor | hover-driven |
| 50 | `div#intro` | fixed, tela cheia | time-driven (enchimento), click (pular) |

## Painel padrão (`.panel`)
- background `rgba(23,18,15,.80)`, `backdrop-filter: blur(14px) saturate(1.15)`
- border `1px solid rgba(239,228,212,.14)`, radius `14px`, sombra `0 12px 40px rgba(0,0,0,.32)`

## Tokens
| Token | Valor |
|---|---|
| texto principal | #EFE4D4 |
| texto secundário | #C2B19C |
| texto terciário | #958571 |
| acento (aba ativa) | #D39A5E |
| acento texto sobre acento | #24170E |
| dourado número | #F6C27A |
| gradiente barra | #E7A95E → #F6C27A |
| vendida (célula) | #FFDCA0 → #E6A65A, texto #4A2C12 |
| fora da tabela | #E3C597 → #BF9563 |
| disponível | fundo rgba(18,26,34,.9), borda rgba(169,205,228,.5), texto #A9CDE4 |
| trilho da barra | rgba(169,205,228,.22) |
| etapas obra | Estrutura #ABA69E · Alvenaria #C56C4B · Fachada #DDB19A · Esquadrias #8FBAD3 · Acabamentos #D39A5E · Lazer #8FAB6B · Entrega #EFE4D4 |

## Tipografia
| Uso | Fonte | Tamanho / peso |
|---|---|---|
| Nome do empreendimento | Cormorant Garamond | 28px |
| Subtítulo header | DM Sans | 11.5px, tracking .23px, #C2B19C |
| Abas | DM Sans | 12px / 600, caixa alta, tracking .96px |
| Segmentos e chips | DM Sans | 12.5px / 500 |
| % vendido | Cormorant Garamond | 40px / 600 |
| Rótulos pequenos | DM Sans | 11px, caixa alta, tracking ~1px |
| Número da unidade | Cormorant Garamond | 52px / 600 |
| Descrição da unidade | Cormorant Garamond itálico | 18px / 500 |
| Valor | Cormorant Garamond | 30px / 600 |
| Fluxo de pagamento | DM Sans | 13px / 600 |
| Nota | DM Sans | 11.5px, #958571 |

## Cena 3D (ordem de montagem)
1. Céu (domo com gradiente) + estrelas (noite) + névoa
2. Montanhas em anel no horizonte (2 camadas)
3. Chão, quadras, ruas, calçadas
4. Cidade procedural: prédios médios/altos com janelas, casas com telhado cerâmico, praças
5. Árvores e postes
6. Lote do empreendimento: pódio (térreo + garagens), lazer, torre, lofts na cobertura, rooftop
7. Grupo "obra" (estrutura/alvenaria/fachada/esquadrias por pavimento, grua, tapume)
8. Pós-processamento: bloom (forte à noite, leve de dia)

## Dependências
- Card e espelho compartilham o estado "unidade selecionada".
- Contorno e seleção atuam nos mesmos materiais das unidades.
- Modo OBRA esconde resumo, card e dica comercial; troca a torre comercial pela torre de obra.
