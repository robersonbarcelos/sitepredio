# BEHAVIORS: Espelho de Vendas 3D (referência: tabela-on.netlify.app)

Levantamento feito em 06/10/2026 pelo navegador, com inspeção de DOM, `getComputedStyle()` e interação em cada controle.
Capturas em `docs/design-references/`.

> Observação de escopo: a referência é de terceiros. Este documento descreve **comportamento**, não código.
> A implementação deste projeto é própria e a marca é neutra.

## 1. Stack observada na referência

| Item | Observado |
|---|---|
| Entrega | 1 arquivo HTML (~600 KB), tudo inline, hospedado no Netlify |
| 3D | Three.js r160 via importmap (jsdelivr) |
| Módulos usados | OrbitControls, EffectComposer, RenderPass, UnrealBloomPass, OutputPass, mergeGeometries |
| Técnicas | InstancedMesh (cidade), CanvasTexture (janelas), Sky, PMREM, fog, sombras, tone mapping, raycast |
| Fontes | Google Fonts: **Cormorant Garamond** (500/600, itálico 500) para números e títulos; **DM Sans** (400/500/600) para UI |
| Assets externos | Nenhum. Cidade, torre, céu e montanhas são procedurais. Logo do intro é uma máscara PNG base64 |

## 2. Modelo de dados observado

- 86 unidades, pavimentos 6 a 17. Pavimentos 6 a 16 com 7 finais, pavimento 17 com 9 lofts duplex.
- Campos por unidade: `id`, `floor`, `fin`, `loft`, `tip` (tipologia), `area`, `desc`, `face` (orientação), `boxes` (retângulos em planta), `vaga`, `price`, `status`.
- `status`: `v` vendida, `d` disponível, `x` fora da tabela (aparece como vendida, sem preço).
- `price`: `{ valor, entrada, mensal, reforco, final }`.
- % vendido = (v + x) / total. Ex.: (49 + 11) / 86 = 69,8%.
- Condição de pagamento: Entrada 10% · 30 mensais 12% · 4 reforços 13% · Parcela final 65%. Nota de correção: CUB até as chaves, IGPM + 0,8% depois.
- Obra: datas em dias desde a época Unix (input range min/max). Etapas com períodos (uma etapa pode ter 2 períodos).

## 3. Sequência de carregamento (time-driven)

1. **Abertura (intro)**: tela escura (#17120F aprox.) com o logotipo do empreendimento em contorno; o interior do logo **enche de líquido dourado** até a altura do % vendido, com borda ondulada (onda dupla, amplitude cai conforme enche). Easing `1 - (1-k)^3`. Contador `67,5% → 69,8%` sincronizado. Legenda: `VENDIDO · 60 DE 86 UNIDADES` (caixa alta, tracking largo). Botão "Pular abertura". Marca da incorporadora pequena no rodapé.
2. Quando o 3D termina de montar **e** o enchimento acaba, segura ~400 ms e faz fade-out.
3. **Fly-in da câmera**: parte de longe/alto e aproxima até o enquadramento "Frente".
4. Painéis aparecem; dica "Clique em uma unidade na fachada" (mobile: "Toque em...").

## 4. Interações (click-driven)

### Barra de controles (topo direito)
| Controle | Tipo | Comportamento |
|---|---|---|
| COMERCIAL / OBRA | abas | Troca o modo. Ativa = fundo #D39A5E, texto #24170E |
| Noite / Dia | segmento | Troca céu, luzes, fog, bloom, janelas da cidade. Ativo = fundo rgba(48,37,30,.94) + inset 1px |
| Frente / Lateral / Fundos / Rooftop | segmento | Anima câmera até o preset. Rooftop = câmera alta e próxima da cobertura |
| Contornar disponíveis | chip toggle | Desenha contorno azul nas janelas das unidades disponíveis. Ativo = inset 1px rgba(211,154,94,.55) e ponto aceso |
| Girar | chip toggle | Auto-rotação da órbita. Ligado por padrão |

### Fachada 3D
- **Hover** em unidade: tooltip escuro perto do cursor (`.tip`: fundo rgba(18,14,12,.9), 12px, raio 8px) e cursor pointer.
- **Clique** em unidade: seleciona, destaca na fachada, abre o card e sincroniza o espelho.
- Arrastar = órbita; scroll/pinça = zoom com limites; não passa abaixo do chão.

### Card da unidade (direita)
- Cabeçalho: `APARTAMENTO · FINAL 05` (ou loft), número grande (Cormorant 52px), pílula de status.
- Descrição em itálico serifado (Cormorant 18px).
- Fatos em 3 colunas: Área privativa, Pavimento (+ cota em metros), Vaga.
- Bloco de preço: `VALOR DE TABELA`, valor (Cormorant 30px), preço por m² privativo, tabela do fluxo de pagamento, nota de correção.
- Navegação: `‹ Disponível anterior` / `Próxima disponível ›` (pula só entre disponíveis).
- Fechar: botão × no canto.

### Resumo (canto inferior esquerdo)
- % vendido (Cormorant 40px, #F6C27A), barra de progresso com gradiente, legenda Luz acesa = vendida / Apagada = disponível.
- `<details>` "ESPELHO POR PAVIMENTO": grade de andares (do mais alto para o mais baixo) × finais (01 a 09). Célula clicável seleciona a unidade.
  - vendida: gradiente dourado claro; disponível: fundo azul escuro com borda azul; fora da tabela: dourado mais apagado; selecionada: classe `.sel`.
  - `title` em cada célula: `1701 · Loft duplex · Disponível`.
- Rodapé com observação da tabela.

### Modo OBRA
- Força Dia ao entrar (pode voltar para Noite).
- Subtítulo do header vira `Cidade · obra · entrega prevista em <mês> de <ano>`.
- Dica no topo esquerdo: "Arraste a linha do tempo ou clique num pavimento".
- A torre passa a ser **montada pela data**: estrutura em concreto cinza, alvenaria em tijolo, fachada na cor final, esquadrias com vidro. Grua presente durante a obra.
- **Painel compacto** (rodapé): mês/ano em serifa + selo `SITUAÇÃO REAL` (até a data real) ou `PROJEÇÃO`; frase de frente de obra ("Estrutura do 5º pavimento"); mini linha do tempo com marcos de ano e marcador "hoje"; botões Hoje, Play, Etapas.
- **Painel expandido**: KPIs `LAJES CONCRETADAS 5 de 20` e `ATÉ A ENTREGA 27 meses`; botões Hoje, Reproduzir, Entrega, Recolher; **Gantt** com 7 etapas (Estrutura, Alvenaria, Fachada, Esquadrias, Acabamentos, Lazer e paisagismo, Vistorias e entrega), cada uma com cor própria, barra de período apagada e preenchimento até o cursor, % à direita; eixo trimestral; linha HOJE; nota de rodapé sobre o que é real e o que é projeção.
- Arrastar em cima do Gantt move o cursor de data (input range sobreposto).

## 5. Estados de cena

| Estado | Céu | Torre | Cidade |
|---|---|---|---|
| Noite | azul profundo, montanhas em silhueta | vendidas acesas (âmbar, bloom), disponíveis apagadas (vidro escuro) | janelas acesas aleatórias, postes acesos |
| Dia | azul claro com névoa | fachada terracota, vidro refletivo | prédios brancos, telhados cerâmicos, árvores |
| Contorno | | disponíveis com contorno azul (#A9CDE4) | |
| Selecionada | | unidade destacada | |

## 6. Hover / transições
- Botões: troca de cor/fundo sem animação longa (transition padrão). Dica: `opacity .4s`.
- Câmera: transições suaves (ease in-out) entre presets.

## 7. Responsivo
| Largura | Layout |
|---|---|
| ≥ 1100px | Header topo-esquerda, controles topo-direita (quebra em 2 linhas), resumo baixo-esquerda, card direita |
| 390px | Header largura total; controles numa linha com rolagem horizontal; dica abaixo; resumo no rodapé largura total; card vira painel inferior |

## 8. Scroll
Nenhum. A página é uma aplicação de tela cheia (canvas fixo), sem rolagem de documento.
