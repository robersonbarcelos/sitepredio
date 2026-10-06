# PRD: Espelho de Vendas 3D

| | |
|---|---|
| Produto | Espelho de Vendas 3D (nome de trabalho) |
| Versão do documento | 1.0 · 06/10/2026 |
| Status | v1 implementada (template com dados fictícios) |
| Público deste documento | sócios, time comercial, desenvolvedores que vão replicar para novos empreendimentos |

---

## 1. Visão

Transformar a tabela de vendas de um empreendimento (hoje uma planilha ou PDF) numa **torre 3D viva**, que o corretor abre no celular na frente do cliente: luz acesa = vendida, apagada = disponível. Um toque na janela mostra a unidade, o preço e o fluxo de pagamento. Um segundo modo mostra a **obra sendo construída** mês a mês.

### Problema
- Tabela em PDF/planilha é difícil de ler, desatualiza rápido e não gera desejo.
- O cliente não entende onde fica a unidade (orientação, andar, vista).
- Escassez ("restam poucas") é dita, não mostrada.
- Pós-venda: o comprador quer saber como está a obra e recebe fotos soltas.

### Proposta de valor
| Para | Valor |
|---|---|
| Incorporadora | Ferramenta premium de lançamento, escassez visual, um link único atualizado toda semana |
| Imobiliária / corretor | Atende no celular, mostra disponibilidade real, compartilha link direto da unidade (`#u=1203`) |
| Comprador | Entende posição, vista e condição de pagamento sem precisar de PDF |
| Relacionamento / pós-venda | Andamento da obra com linha do tempo real vs projeção |

---

## 2. Personas

1. **Diretora comercial da incorporadora**: quer padronizar a apresentação e acelerar vendas no lançamento. Decide a compra.
2. **Corretor (parceiro ou imobiliária)**: atende em plantão e por WhatsApp. Precisa de rapidez e de um link confiável.
3. **Comprador final**: compara unidades e quer entender valor e parcelas.
4. **Gestor de obra / relacionamento**: atualiza o cronograma e responde "quando fica pronto?".

---

## 3. Escopo funcional (v1)

### 3.1 Abertura
| ID | Requisito |
|---|---|
| RF-01 | Tela de abertura com o nome do empreendimento em contorno, que enche de líquido dourado até o % vendido (onda animada) |
| RF-02 | Contador de % sincronizado e legenda `vendido · X de N unidades` |
| RF-03 | Botão "Pular abertura"; respeita `prefers-reduced-motion` |
| RF-04 | A abertura só sai quando a cena 3D está pronta; depois, a câmera faz um voo de aproximação até a fachada |

### 3.2 Cena 3D
| ID | Requisito |
|---|---|
| RF-10 | Torre gerada a partir da configuração (pódio, garagens, lazer, pavimentos-tipo, lofts, ático, rooftop) |
| RF-11 | Cidade procedural ao redor (prédios, casas com telhado, praças, árvores, postes, trânsito), orla com mar opcional, montanhas em camadas |
| RF-12 | Dia: céu físico com névoa atmosférica; Noite: domo estrelado, lua, janelas da cidade acesas, poças de luz dos postes, faróis |
| RF-13 | Órbita com o mouse/toque, zoom com limites, sem atravessar o chão; auto-rotação opcional |
| RF-14 | Câmeras pré-definidas: Frente, Lateral, Fundos, Rooftop (transição suave) |

### 3.3 Modo Comercial
| ID | Requisito |
|---|---|
| RF-20 | Unidades vendidas, reservadas e fora da tabela com luz acesa; disponíveis apagadas (vidro escuro) |
| RF-21 | Hover mostra tooltip (`1203 · 1S+1Q · 74,60 m² · Disponível`) |
| RF-22 | Clique/toque seleciona: destaque pulsante na fachada, câmera enquadra a unidade, abre o card |
| RF-23 | Card: tipo e final, número, status, descrição, área privativa, pavimento + cota, vaga, valor de tabela, R$/m², fluxo de pagamento, nota de correção |
| RF-24 | Unidade vendida/fora da tabela: sem preço, com mensagem e navegação para as disponíveis |
| RF-25 | Navegação "Disponível anterior / Próxima disponível" |
| RF-26 | "Contornar disponíveis": contorno azul pulsante nas janelas das disponíveis |
| RF-27 | Resumo: % vendido, barra, legenda |
| RF-28 | Espelho por pavimento (grade andar × final), clicável, sincronizado com a seleção |
| RF-29 | Link direto da unidade (`#u=ID`) abre já selecionada |
| RF-30 | Botão "Tenho interesse" via WhatsApp quando `contato.whatsapp` está configurado |

### 3.4 Modo Obra
| ID | Requisito |
|---|---|
| RF-40 | A torre é montada pela data: pilares e formas na laje em execução, laje concretada, alvenaria (tijolo), fachada (cor final), esquadrias (vidro) |
| RF-41 | Volume futuro em contorno fantasma; grua sobe com a estrutura e sai quando a fachada termina; tapume e canteiro até a fase de lazer |
| RF-42 | Linha do tempo compacta: mês/ano, selo "situação real" (até `realAte`) ou "projeção", frase de frente de obra, marcador "hoje" |
| RF-43 | Painel expandido: KPIs (lajes concretadas, meses até a entrega), Gantt com as etapas e % de cada uma, eixo trimestral, nota de rodapé |
| RF-44 | Botões Hoje, Reproduzir/Pausar, Entrega, Recolher; arrastar sobre o Gantt muda a data |
| RF-45 | Clique num pavimento leva a linha do tempo para a data da laje daquele pavimento |

### 3.5 Responsivo
| ID | Requisito |
|---|---|
| RF-50 | Desktop: painéis flutuantes (header, controles, resumo, card) |
| RF-51 | Mobile: controles em faixa rolável, card como painel inferior, câmera recua e sobe para enquadrar a torre em retrato |

---

## 4. Requisitos não funcionais

| ID | Requisito | Meta |
|---|---|---|
| RNF-01 | Hospedagem estática, sem backend | qualquer CDN (Netlify, Vercel, Cloudflare) |
| RNF-02 | Peso | < 400 KB de código próprio; Three.js via CDN |
| RNF-03 | Desempenho | 60 fps em desktop médio; 30+ fps em celular intermediário (sombras 2048, MSAA 2x no mobile) |
| RNF-04 | Robustez | não trava com viewport zero (aba oculta/iframe); avisa no console unidade sem janela |
| RNF-05 | Atualização | trocar a tabela não exige mexer em código |
| RNF-06 | Acessibilidade básica | botões com `aria-pressed`, Esc fecha o card, contraste dos painéis, reduced motion |
| RNF-07 | Privacidade | nenhum cookie ou rastreador por padrão |

---

## 5. Modelo de dados

### 5.1 `data/empreendimento.js` (muda uma vez por projeto)
| Bloco | Campos principais |
|---|---|
| `produto` | `nome`, `nomeCompleto`, `cidade` |
| `incorporadora` | `nome`, `sigla`, `logo` |
| `contato` | `whatsapp`, `mensagem` (`{id}`, `{produto}`) |
| `cores` | `fachada`, `detalhe`, `lamina`, `podio`, `luzVendida`, `contorno`, `selecao` |
| `torre` | `largura`, `profundidade`, `lamina`, `podio{largura, profundidade, niveis[]}`, `lazer`, `atico`, `rooftop` |
| `tipologias` | chave → `{nome, curto}` |
| `plantas[]` | `id`, `rotulo`, `pavimentos[de, até]`, `altura`, `vidroInteiro`, `unidades[]{final, tipologia, area, desc, rect[x0,z0,x1,z1], sacada}` |
| `pagamento[]` | `{rotulo, pct, n}` (somam 100%) |
| `notaPagamento` | texto de correção monetária |
| `obra` | `inicio`, `realAte`, `entrega`, `notaReal`, `etapas[]{nome, cor, tipo, sentido, periodos[[ini, fim]], papel?}` |
| `cena` | `seed`, `raioCidade`, `modoInicial`, `girarAoAbrir`, `mar` |

### 5.2 `data/tabela.js` (muda toda semana, gerado do CSV)
`[unidade, status, valor, vaga]`, com status `d` disponível, `v` vendida, `r` reservada, `x` fora da tabela.

### 5.3 Unidade derivada (em memória)
`id = pavimento + final`, tipologia, área, descrição, retângulo, sacada, status, vaga, valor, fluxo calculado, cota, centro e normal na fachada (para a câmera).

---

## 6. Regras de negócio

1. **% vendido** = (vendidas + fora da tabela) ÷ total. Reservadas **não** contam como vendidas, mas aparecem acesas (mais fracas) e com pílula "Reservada".
2. **Fluxo de pagamento**: parcela = valor × pct ÷ n. Ex.: 36 mensais de 12% de R$ 916.038,56 = R$ 3.053,46.
3. **R$/m²** = valor ÷ área privativa, sem casas decimais.
4. **Cota** = altura do piso do pavimento em relação ao térreo (soma das alturas abaixo).
5. **Unidade sem linha no CSV** é tratada como vendida (fail-safe: nunca anunciar como disponível algo que não está na tabela).
6. **Disponível sem valor** bloqueia a geração da tabela (o script recusa).
7. **Obra**: etapa `pavimentos` avança pavimento a pavimento proporcional ao tempo (sentido `sobe` ou `desce`); etapa `global` só tem %. Data ≤ `realAte` = "situação real"; depois = "projeção".
8. **Lajes concretadas** = pavimentos com estrutura concluída na data.
9. **Atribuição de janela à unidade**: cada módulo de fachada pertence à unidade cujo retângulo contém o ponto 35 cm para dentro da face; módulo sem unidade (núcleo/hall) vira parede.

---

## 7. Arquitetura

```
index.html ── data/empreendimento.js ── data/tabela.js
     │
     └─ js/main.js ─┬─ js/data.js      (pavimentos, unidades, cronograma, formatação)
                    ├─ js/world.js     (céu, luz, montanhas, mar, cidade, trânsito)
                    ├─ js/tower.js     (torre comercial + torre de obra)
                    ├─ js/ui.js        (painéis comerciais + abertura)
                    └─ js/obra-ui.js   (linha do tempo + Gantt)
```

- Render: WebGL (Three.js r160), ACES tone mapping, sombras PCF suaves, MSAA no render target, bloom, color grading com vinheta (valores diferentes para dia e noite).
- Geometria mesclada por material (poucas draw calls); árvores, postes e carros instanciados.
- Texturas 100% procedurais (canvas): janelas da cidade, interiores das unidades, concreto, brises, jardim vertical, tijolo, água.

---

## 8. Métricas de sucesso

| Métrica | Como medir (v1.1 com analytics) |
|---|---|
| Uso por corretor | sessões por link de corretor (`?c=nome`) |
| Interesse por unidade | cliques por unidade, unidades mais vistas vs vendidas |
| Conversão | cliques em "Tenho interesse" por unidade disponível |
| Atualização | dias desde a última tabela publicada (meta: ≤ 7) |
| Desempenho | fps médio e tempo até a abertura sair |

---

## 9. Roadmap

| Versão | Itens |
|---|---|
| **v1 (feito)** | Tudo da seção 3, template configurável, pipeline CSV, documentação |
| v1.1 | Filtros (tipologia, faixa de preço, vista), comparar 2 unidades, link por corretor, analytics leve (Plausible/Umami), botão WhatsApp por corretor |
| v1.2 | Planta baixa 2D da unidade no card, galeria de imagens por tipologia, simulador de parcelas (entrada editável) |
| v2 | Painel administrativo: tabela via Google Sheets/Airtable publicada automaticamente; várias torres por empreendimento; reserva temporária com expiração |
| v3 | Importar o modelo real do arquiteto (glTF/IFC) no lugar da torre procedural; fotos de obra georreferenciadas por data |

---

## 10. Oferta sugerida (para validar com o mercado)

| Pacote | Inclui | Esforço estimado |
|---|---|---|
| **Essencial** | Torre procedural configurada, modo comercial, tabela semanal via CSV, hospedagem | 1 a 2 dias por empreendimento |
| **Completo** | Essencial + modo obra com cronograma, cores e marca do cliente, link por corretor | 2 a 4 dias |
| **Assinatura** | Atualização semanal da tabela e mensal da obra, suporte, relatório de unidades mais vistas | recorrente |

Valores a definir após conversas com 3 a 5 incorporadoras. O custo de infraestrutura é praticamente zero (site estático).

---

## 11. Riscos e limitações

| Risco | Mitigação |
|---|---|
| Torre procedural não é idêntica ao projeto arquitetônico | Cores, volumetria, pódio, sacadas e lâmina configuráveis; v3 aceita modelo real |
| Tabela desatualizada gera problema comercial | Script valida, `no-cache` nos dados, data da tabela visível no header |
| Celulares antigos | Qualidade reduzida automaticamente no mobile; fallback de mensagem se WebGL falhar (a implementar na v1.1) |
| Propriedade intelectual | Implementação própria e marca neutra; não usar nome, marca ou dados de empreendimentos de terceiros |
