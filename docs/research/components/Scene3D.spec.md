# Scene3D Specification
- **Arquivos:** `js/world.js`, `js/tower.js`, `js/main.js`
- **Interaction model:** drag (órbita), wheel/pinch (zoom), hover (tooltip), click (seleção / pavimento na obra)
## Câmera
- PerspectiveCamera fov 38, near 1, far 16000; OrbitControls com damping .07, distância 28–460, polar .12–1.48, auto-rotação .45
- presets (azimute, elevação, multiplicador da distância de enquadramento): Frente (.36, .10, 1.12) · Lateral (1.52, .12, 1.12) · Fundos (π+.42, .14, 1.12) · Rooftop (.78, .50, .5, alvo no topo)
- obra: alvo mais baixo (30% da altura), +20% distância, +.16 elevação; retrato: +.10 elevação
- seleção: enquadra a face da unidade a ~115 m, deslocada para a esquerda quando o card ocupa a direita
## Render
- ACES, exposição noite 1.05 / dia .92; sombras PCFSoft 4096 (2048 mobile)
- MSAA 4x (2x mobile) em render target half-float; bloom noite .62/.55/.82, dia .14/.35/.96
- grading: vinheta noite .62 / dia .36, saturação ~1.07–1.10, contraste ~1.05, lift azul à noite
## Luz e céu
- dia: Sky (turbidez 3.2, rayleigh 2.1), sol a 34° de elevação; névoa exp .0008 #c4d5e2
- noite: domo em gradiente + brilho urbano no horizonte, 2600 estrelas cintilantes, lua com halo; névoa exp .0012 #1a2747
- reflexos: PMREM do céu de dia e do domo de noite
## Cidade
- quadras de 60 m, ruas de 10 m, calçadas; vizinhos baixos perto da torre, mais altos ao longe; casas com telhado cerâmico; praças; árvores e palmeiras instanciadas; postes com poça de luz; 170 carros (90 mobile) com faróis
