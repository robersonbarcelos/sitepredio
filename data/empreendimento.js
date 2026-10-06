/* ==========================================================================
   CONFIGURAÇÃO DO EMPREENDIMENTO
   --------------------------------------------------------------------------
   Este é o ÚNICO arquivo que muda de um empreendimento para outro
   (junto com data/tabela.js, que guarda status e preço das unidades).
   Medidas em metros. Planta: x vai da esquerda (-) para a direita (+)
   olhando a fachada principal; z vai dos fundos (-) para a frente (+).
   Todos os dados abaixo são FICTÍCIOS (demonstração).
   ========================================================================== */
window.EMPREENDIMENTO = {

  // ---- Identidade ----------------------------------------------------------
  produto: {
    nome: 'AURORA',                       // aparece no header e na abertura
    nomeCompleto: 'Residencial Aurora',
    cidade: 'Balneário Exemplo',
  },
  incorporadora: {
    nome: 'Sua Incorporadora',
    sigla: 'SUA MARCA',                   // marca pequena (texto) no header e na abertura
    logo: null,                           // opcional: caminho de imagem (ex.: 'assets/logo.svg')
  },
  contato: {
    whatsapp: '',                         // opcional: '5547999999999' mostra botão "Tenho interesse"
    mensagem: 'Olá! Tenho interesse na unidade {id} do {produto}.',
  },

  // ---- Paleta da torre (cena 3D) ------------------------------------------
  cores: {
    fachada: '#c98a6c',       // massa principal da torre
    detalhe: '#3b2a22',       // faixas de laje, molduras
    lamina: '#8a5a3c',        // lâmina vertical de destaque
    podio: '#2e2622',         // garagens (brises)
    luzVendida: '#ffc27a',    // luz acesa das unidades vendidas (noite)
    contorno: '#a9cde4',      // contorno das disponíveis
    selecao: '#f6c27a',       // unidade selecionada
  },

  // ---- Volumetria -----------------------------------------------------------
  torre: {
    largura: 24,
    profundidade: 16,
    lamina: { x: 3.2, altura: 2.5 },      // lâmina vertical na fachada frontal (null para remover)
    podio: {
      largura: 36,
      profundidade: 28,
      niveis: [                           // de baixo para cima
        { nome: 'Térreo', curto: 'térreo', altura: 5.0, tipo: 'terreo' },
        { nome: 'G1', curto: 'G1', altura: 3.0, tipo: 'garagem' },
        { nome: 'G2', curto: 'G2', altura: 3.0, tipo: 'garagem' },
        { nome: 'G3', curto: 'G3', altura: 3.0, tipo: 'garagem' },
      ],
    },
    lazer: { nome: 'Lazer', curto: 'lazer', altura: 4.2 },   // pavimento de lazer sobre o pódio
    atico: { nome: 'Ático', curto: 'ático', altura: 3.2, largura: 11, profundidade: 7 },
    rooftop: { piscina: true },
  },

  // ---- Plantas ---------------------------------------------------------------
  // rect = [x0, z0, x1, z1] da unidade dentro da projeção da torre.
  // A área exibida vem de "area" (não do desenho). "sacada" = face com sacada (S, N, L, O).
  tipologias: {
    studio: { nome: 'Studio', curto: 'Studio' },
    '1s1q': { nome: '1 suíte + 1 quarto', curto: '1S+1Q' },
    '2s':   { nome: '2 suítes', curto: '2S' },
    loft:   { nome: 'Loft duplex', curto: 'Loft' },
  },
  plantas: [
    {
      id: 'tipo',
      rotulo: 'Apartamento',
      pavimentos: [4, 14],
      altura: 3.05,
      unidades: [
        { final: '01', tipologia: 'studio', area: 28.40, desc: 'Studio · frente, ao lado do hall',        rect: [-7.7, 1, -3.75, 8] },
        { final: '02', tipologia: 'studio', area: 44.20, desc: 'Studio ampliado · frente',                rect: [-3.75, 1, 2.65, 8] },
        { final: '03', tipologia: '1s1q',   area: 74.60, desc: '1 suíte + 1 quarto · canto, sacada frontal', rect: [2.65, 0, 12, 8], sacada: 'S' },
        { final: '04', tipologia: 'studio', area: 39.50, desc: 'Studio · fundos, vista livre',            rect: [-6, -8, -2.5, 1] },
        { final: '05', tipologia: '2s',     area: 78.30, desc: '2 suítes · canto, com sacada lateral',    rect: [2, -8, 12, 0], sacada: 'L' },
        { final: '06', tipologia: '1s1q',   area: 66.10, desc: '1 suíte + 1 quarto · canto oeste, sacada', rect: [-12, -8, -6, 1], sacada: 'O' },
        { final: '07', tipologia: 'studio', area: 31.20, desc: 'Studio · canto frontal oeste',            rect: [-12, 1, -7.7, 8] },
      ],
    },
    {
      id: 'loft',
      rotulo: 'Loft duplex',
      pavimentos: [15, 15],
      altura: 5.6,
      vidroInteiro: true,
      unidades: [
        { final: '01', tipologia: 'loft', area: 46.10, desc: 'Loft duplex · canto frontal oeste', rect: [-12, 0, -7.2, 8] },
        { final: '02', tipologia: 'loft', area: 52.40, desc: 'Loft duplex · frente',              rect: [-7.2, 0, -2.4, 8] },
        { final: '03', tipologia: 'loft', area: 52.40, desc: 'Loft duplex · frente central',      rect: [-2.4, 0, 2.4, 8] },
        { final: '04', tipologia: 'loft', area: 52.40, desc: 'Loft duplex · frente',              rect: [2.4, 0, 7.2, 8] },
        { final: '05', tipologia: 'loft', area: 58.90, desc: 'Loft duplex · canto frontal leste', rect: [7.2, 0, 12, 8] },
        { final: '06', tipologia: 'loft', area: 55.70, desc: 'Loft duplex · canto fundos oeste',  rect: [-12, -8, -6.5, 0] },
        { final: '07', tipologia: 'loft', area: 44.30, desc: 'Loft duplex · fundos',              rect: [-6.5, -8, -2.5, 0] },
        { final: '08', tipologia: 'loft', area: 48.80, desc: 'Loft duplex · fundos',              rect: [2, -8, 7, 0] },
        { final: '09', tipologia: 'loft', area: 57.20, desc: 'Loft duplex · canto fundos leste',  rect: [7, -8, 12, 0] },
      ],
    },
  ],

  // ---- Condição de pagamento -------------------------------------------------
  // Percentuais somam 100. "n" = número de parcelas.
  pagamento: [
    { rotulo: 'Entrada',        pct: 10 },
    { rotulo: 'mensais',        pct: 12, n: 36 },
    { rotulo: 'reforços anuais', pct: 13, n: 3 },
    { rotulo: 'Parcela final',  pct: 65 },
  ],
  notaPagamento: 'Parcelas e reforços corrigidos pelo INCC até as chaves; após as chaves, IGPM + 1% a.m. Valores ilustrativos.',

  // ---- Cronograma de obra -----------------------------------------------------
  // tipo 'pavimentos' = avança pavimento a pavimento (sentido 'sobe' ou 'desce').
  // tipo 'global' = etapa única (sem pavimento).
  obra: {
    inicio: '2026-06-01',
    realAte: '2026-10-02',                // até esta data é "situação real"; depois é projeção
    entrega: '2028-11-30',
    notaReal: 'Real até 02/10/2026: térreo, G1, G2, G3 e laje do lazer concretados. Demais etapas são projeção do cronograma para entrega em novembro de 2028. Dados ilustrativos.',
    etapas: [
      { nome: 'Estrutura',          cor: '#aba69e', tipo: 'pavimentos', sentido: 'sobe',  periodos: [['2026-06-01', '2027-05-15']] },
      { nome: 'Alvenaria',          cor: '#c56c4b', tipo: 'pavimentos', sentido: 'sobe',  periodos: [['2026-08-15', '2027-09-30']] },
      { nome: 'Fachada',            cor: '#ddb19a', tipo: 'pavimentos', sentido: 'desce', periodos: [['2027-08-01', '2028-05-31']] },
      { nome: 'Esquadrias',         cor: '#8fbad3', tipo: 'pavimentos', sentido: 'sobe',  periodos: [['2027-10-01', '2028-05-20'], ['2028-08-01', '2028-09-10']] },
      { nome: 'Acabamentos',        cor: '#d39a5e', tipo: 'pavimentos', sentido: 'sobe',  periodos: [['2027-08-01', '2028-09-30']] },
      { nome: 'Lazer e paisagismo', cor: '#8fab6b', tipo: 'global',                       periodos: [['2028-05-01', '2028-10-15']] },
      { nome: 'Vistorias e entrega', cor: '#efe4d4', tipo: 'global',                      periodos: [['2028-10-01', '2028-11-30']] },
    ],
  },

  // ---- Cena ------------------------------------------------------------------
  cena: {
    seed: 7,                 // muda a cidade gerada
    raioCidade: 420,
    modoInicial: 'noite',    // 'noite' ou 'dia'
    girarAoAbrir: true,
  },
};
