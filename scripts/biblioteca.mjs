// Biblioteca de exercícios por categoria (populações especiais e adolescentes incluídos).
// Uso: node --env-file=.env.local scripts/biblioteca.mjs
// - Cria a coluna "category" se faltar.
// - Insere os exercícios que ainda não existem (pelo nome).
// - Nos que já existem: só preenche categoria e link quando estão vazios (não sobrescreve nada).
// Links: busca do YouTube já filtrada pelo exercício. Sempre abre vídeos reais de execução;
// o professor pode trocar por um vídeo específico na Biblioteca.
import { neon } from '@neondatabase/serverless';

const sql = neon(process.env.DATABASE_URL);
const yt = q => `https://www.youtube.com/results?search_query=${encodeURIComponent(q)}`;

const SEG_CARD = 'Somente com liberação médica. Intensidade leve a moderada (esforço 11–13 de 20, consegue conversar). Respire sem prender o ar. Pare se sentir dor no peito, tontura, falta de ar fora do normal ou palpitação.';
const SEG_IDOSO = 'Movimento lento e controlado, com apoio por perto. Respire sem prender o ar. Pare se sentir dor, tontura ou desequilíbrio.';
const SEG_OBES = 'Baixo impacto, preservando joelhos e coluna. Ritmo em que ainda dá para conversar; aumente a duração antes da intensidade.';
const SEG_TEEN = 'Para adolescentes a partir de 12–13 anos, com autorização dos responsáveis e supervisão do professor. Técnica antes da carga: peso do corpo ou carga leve, 1–3 séries de 8–15 repetições, sem testes de carga máxima. Aumente a carga aos poucos (5–10%) só com a execução perfeita.';

// [categoria, nome, observações, termo extra para a busca do vídeo]
const L = [
  // ---------------- Peito ----------------
  ['Peito', 'Supino reto com barra', 'Escápulas encaixadas, pés firmes no chão. Barra desce até a linha do peito e sobe sem tirar o quadril do banco.'],
  ['Peito', 'Supino reto com halteres', 'Mais amplitude que a barra. Halteres descem até a lateral do peito, cotovelos a ~45° do tronco.'],
  ['Peito', 'Supino inclinado com barra', 'Banco a 30–45°. Ênfase na parte superior do peito.'],
  ['Peito', 'Supino inclinado com halteres', 'Banco a 30–45°. Controle a descida em 2–3 s.'],
  ['Peito', 'Supino declinado', 'Ênfase na parte inferior do peito. Trave bem os pés no apoio.'],
  ['Peito', 'Supino na máquina', 'Opção segura para iniciantes: trajetória guiada. Ajuste o banco para a pegada ficar na linha do peito.'],
  ['Peito', 'Crucifixo reto com halteres', 'Cotovelos levemente flexionados e fixos. Abra até sentir alongar o peito, sem passar da linha do ombro.'],
  ['Peito', 'Crucifixo inclinado com halteres', 'Banco a 30°. Mesma técnica do crucifixo reto.'],
  ['Peito', 'Crucifixo na máquina (peck deck)', 'Ombros para trás e para baixo. Junte as mãos à frente do peito e volte devagar.'],
  ['Peito', 'Crossover na polia', 'Passo à frente, tronco levemente inclinado. Mãos se encontram à frente do quadril ou do peito.'],
  ['Peito', 'Flexão de braço', 'Corpo em linha reta da cabeça aos pés. Peito desce perto do chão.'],
  ['Peito', 'Flexão de braço com joelhos apoiados', 'Versão mais leve da flexão, para iniciantes. Mantenha quadril alinhado.'],
  ['Peito', 'Flexão de braço na parede', 'Ótima para iniciantes e idosos. Quanto mais longe da parede, mais difícil.', 'flexão na parede'],
  ['Peito', 'Pullover com halter', 'Deitado no banco, braços quase estendidos. Leve o halter atrás da cabeça só até onde o ombro permitir.'],
  ['Peito', 'Mergulho nas paralelas', 'Tronco levemente à frente para ênfase no peito. Desça até o cotovelo a ~90°.'],

  // ---------------- Costas ----------------
  ['Costas', 'Puxada na frente', null],
  ['Costas', 'Puxada com pegada neutra (triângulo)', 'Puxe o triângulo até o alto do peito, cotovelos rente ao corpo.'],
  ['Costas', 'Puxada supinada', 'Palmas para você, pegada na largura dos ombros. Ênfase em dorsal e bíceps.'],
  ['Costas', 'Barra fixa', 'Comece pendurado com braços estendidos. Suba até o queixo passar da barra, sem balançar.'],
  ['Costas', 'Barra fixa assistida (graviton ou elástico)', 'Mesma técnica da barra fixa, com ajuda para quem ainda não faz o peso do corpo.'],
  ['Costas', 'Remada baixa', null],
  ['Costas', 'Remada curvada com barra', 'Tronco a ~45°, coluna neutra. Puxe a barra em direção ao umbigo.'],
  ['Costas', 'Remada unilateral com halter (serrote)', 'Apoio de mão e joelho no banco. Puxe o halter em direção ao quadril.'],
  ['Costas', 'Remada cavalinho (T-bar)', 'Peito apoiado ou tronco firme. Cotovelos para trás, junte as escápulas.'],
  ['Costas', 'Remada na máquina articulada', 'Peito no apoio. Puxe sem jogar o tronco para trás.'],
  ['Costas', 'Pulldown com braços estendidos na polia', 'Braços quase retos. Leve a barra da altura dos olhos até as coxas.'],
  ['Costas', 'Levantamento terra', 'Barra rente às pernas, coluna neutra. Empurre o chão com os pés e estenda quadril e joelhos juntos.'],
  ['Costas', 'Hiperextensão lombar no banco romano', 'Desça com a coluna neutra e suba até alinhar o corpo, sem hiperestender.'],
  ['Costas', 'Encolhimento de ombros com halteres', 'Suba os ombros em direção às orelhas, segure 1 s, desça devagar. Sem girar.'],
  ['Costas', 'Remada com elástico', 'Elástico preso à frente. Puxe juntando as escápulas. Ótima opção em casa e para iniciantes.'],

  // ---------------- Ombros ----------------
  ['Ombros', 'Desenvolvimento com halteres', null],
  ['Ombros', 'Desenvolvimento com barra', 'Sentado ou em pé, abdômen firme. Barra sobe à frente do rosto até estender os braços.'],
  ['Ombros', 'Desenvolvimento na máquina', 'Trajetória guiada, boa para iniciantes. Não trave os cotovelos no topo.'],
  ['Ombros', 'Desenvolvimento Arnold', 'Comece com palmas para você e gire durante a subida.'],
  ['Ombros', 'Elevação lateral', null],
  ['Ombros', 'Elevação lateral na polia', 'Tensão constante. Puxe pela lateral até a altura do ombro.'],
  ['Ombros', 'Elevação frontal com halteres', 'Suba até a altura dos ombros, sem balançar o tronco.'],
  ['Ombros', 'Crucifixo invertido (deltoide posterior)', 'Tronco inclinado ou no peck deck invertido. Abra os braços juntando as escápulas.'],
  ['Ombros', 'Face pull na polia', 'Corda na altura do rosto. Puxe abrindo as mãos, cotovelos altos. Ótimo para postura.'],
  ['Ombros', 'Remada alta', 'Pegada na largura dos ombros, suba até o peito. Evite se houver dor no ombro.'],
  ['Ombros', 'Rotação externa de ombro com elástico', 'Cotovelo colado ao corpo a 90°. Gire o antebraço para fora devagar. Prevenção de lesões.'],

  // ---------------- Braços ----------------
  ['Braços', 'Rosca direta', null],
  ['Braços', 'Rosca alternada com halteres', 'Cotovelos fixos ao lado do corpo. Gire o punho durante a subida.'],
  ['Braços', 'Rosca martelo', 'Pegada neutra (palmas uma para a outra). Trabalha bíceps e antebraço.'],
  ['Braços', 'Rosca Scott', 'Braços apoiados no banco Scott. Não estenda totalmente com carga alta.'],
  ['Braços', 'Rosca concentrada', 'Sentado, cotovelo apoiado na coxa. Suba devagar e aperte no topo.'],
  ['Braços', 'Rosca na polia', 'Tensão constante. Cotovelos parados.'],
  ['Braços', 'Rosca martelo + tríceps banco (bi-set)', null],
  ['Braços', 'Tríceps corda', null],
  ['Braços', 'Tríceps barra na polia', 'Cotovelos colados ao corpo, só o antebraço se move.'],
  ['Braços', 'Tríceps francês com halter', null],
  ['Braços', 'Tríceps testa', 'Deitado, barra desce em direção à testa com cotovelos apontando para cima.'],
  ['Braços', 'Tríceps banco', 'Mãos no banco atrás do corpo. Desça até cotovelo a 90°. Joelhos flexionados deixam mais leve.'],
  ['Braços', 'Tríceps coice com halter', 'Tronco inclinado, cotovelo alto e fixo. Estenda o braço para trás.'],
  ['Braços', 'Rosca de punho', 'Antebraços apoiados na coxa. Movimente só o punho. Fortalece a pegada.'],

  // ---------------- Pernas e glúteos ----------------
  ['Pernas e glúteos', 'Agachamento (Smith ou livre)', null],
  ['Pernas e glúteos', 'Agachamento goblet', 'Halter ou kettlebell junto ao peito. Ótimo para aprender a agachar.'],
  ['Pernas e glúteos', 'Agachamento sumô', 'Pés afastados e virados para fora. Ênfase em adutores e glúteos.'],
  ['Pernas e glúteos', 'Agachamento hack', 'Costas apoiadas na máquina. Desça controlando, joelhos alinhados aos pés.'],
  ['Pernas e glúteos', 'Agachamento frontal', 'Barra apoiada à frente dos ombros, tronco mais vertical.'],
  ['Pernas e glúteos', 'Leg press 45°', 'Pés na largura do quadril. Não deixe a lombar sair do encosto na descida.'],
  ['Pernas e glúteos', 'Leg press 45° com pés altos', null],
  ['Pernas e glúteos', 'Leg press horizontal', 'Versão mais confortável para iniciantes e idosos.'],
  ['Pernas e glúteos', 'Cadeira extensora', null],
  ['Pernas e glúteos', 'Mesa flexora', null],
  ['Pernas e glúteos', 'Cadeira flexora', 'Sentado, quadril bem encaixado. Flexione os joelhos e volte devagar.'],
  ['Pernas e glúteos', 'Flexora em pé unilateral', 'Apoie as mãos e flexione um joelho por vez.'],
  ['Pernas e glúteos', 'Stiff com barra', null],
  ['Pernas e glúteos', 'Stiff com halteres', 'Quadril vai para trás, halteres rente às pernas, coluna neutra.'],
  ['Pernas e glúteos', 'Levantamento terra romeno', 'Parecido com o stiff, joelhos um pouco mais flexionados.'],
  ['Pernas e glúteos', 'Passada andando ou afundo', null],
  ['Pernas e glúteos', 'Afundo estático', 'Pés afastados à frente e atrás. Desça o joelho de trás em direção ao chão.'],
  ['Pernas e glúteos', 'Búlgaro com tronco inclinado à frente', null],
  ['Pernas e glúteos', 'Subida no banco (step-up)', 'Suba empurrando com a perna da frente, sem impulso da de trás.'],
  ['Pernas e glúteos', 'Elevação pélvica com barra', null],
  ['Pernas e glúteos', 'Elevação pélvica unilateral ou na máquina', null],
  ['Pernas e glúteos', 'Ponte de glúteo no chão', 'Deitado, joelhos flexionados. Suba o quadril apertando o glúteo e segure 2 s.'],
  ['Pernas e glúteos', 'Hiperextensão com foco em glúteo', null],
  ['Pernas e glúteos', 'Cadeira abdutora', null],
  ['Pernas e glúteos', 'Cadeira adutora', 'Feche as pernas devagar, sem bater os apoios.'],
  ['Pernas e glúteos', 'Abdução na polia em pé', null],
  ['Pernas e glúteos', 'Coice na polia', null],
  ['Pernas e glúteos', 'Coice de glúteo em quatro apoios', 'Joelho a 90°, empurre o pé em direção ao teto sem arquear a lombar.'],
  ['Pernas e glúteos', 'Abdução de quadril deitado', 'De lado, perna de cima sobe estendida até ~45°. Use caneleira para progredir.'],
  ['Pernas e glúteos', 'Panturrilha em pé', 'Suba na ponta dos pés, segure 1 s no topo e desça alongando.'],
  ['Pernas e glúteos', 'Panturrilha sentado', 'Ênfase no sóleo. Amplitude completa.'],

  // ---------------- Core e abdômen ----------------
  ['Core e abdômen', 'Prancha frontal', 'Cotovelos sob os ombros, corpo reto, abdômen e glúteo contraídos. Não deixe o quadril cair.'],
  ['Core e abdômen', 'Prancha lateral', 'Apoio no antebraço e na lateral do pé (ou joelho, para facilitar). Quadril alto.'],
  ['Core e abdômen', 'Prancha com joelhos apoiados', 'Versão inicial da prancha frontal.'],
  ['Core e abdômen', 'Abdominal supra (crunch)', 'Tire só as escápulas do chão, sem puxar o pescoço.'],
  ['Core e abdômen', 'Abdominal infra (elevação de pernas)', 'Lombar colada ao chão. Desça as pernas só até onde conseguir manter.'],
  ['Core e abdômen', 'Abdominal bicicleta', 'Leve o cotovelo em direção ao joelho oposto, devagar.'],
  ['Core e abdômen', 'Dead bug', 'Deitado, braços e pernas para cima. Estenda braço e perna opostos mantendo a lombar no chão.'],
  ['Core e abdômen', 'Bird dog (perdigueiro)', 'Em quatro apoios, estenda braço e perna opostos sem girar o quadril. Ótimo para a lombar.'],
  ['Core e abdômen', 'Pallof press', 'Polia ou elástico ao lado. Empurre à frente do peito sem deixar o tronco girar.'],
  ['Core e abdômen', 'Abdominal na polia (crunch ajoelhado)', 'Ajoelhado, flexione o tronco levando os cotovelos em direção às coxas.'],
  ['Core e abdômen', 'Elevação de pernas na barra', 'Pendurado, suba os joelhos (ou pernas retas) sem balançar.'],
  ['Core e abdômen', 'Rotação russa (russian twist)', 'Sentado, tronco inclinado, gire de um lado para o outro.'],
  ['Core e abdômen', 'Roda abdominal', 'Avançado. Role à frente só até onde mantiver a lombar neutra.'],
  ['Core e abdômen', 'Vacuum abdominal', 'Solte o ar e puxe o umbigo para dentro, segurando 10–20 s.'],

  // ---------------- Funcional ----------------
  ['Funcional', 'Kettlebell swing', 'Movimento de quadril (não de agachamento). Braços só guiam o kettlebell até a altura do peito.'],
  ['Funcional', 'Burpee', 'Agacha, apoia as mãos, leva os pés para trás, volta e salta. Alta intensidade.'],
  ['Funcional', 'Mountain climber (escalador)', 'Posição de prancha, leve os joelhos alternados em direção ao peito.'],
  ['Funcional', 'Agachamento com salto', 'Aterrisse suave, com joelhos flexionados. Alto impacto.'],
  ['Funcional', 'Farmer walk (caminhada do fazendeiro)', 'Caminhe com pesos nas mãos, postura ereta e ombros para trás.'],
  ['Funcional', 'Thruster', 'Agachamento com desenvolvimento ao subir, em um só movimento.'],
  ['Funcional', 'Battle rope (corda naval)', 'Ondas alternadas ou simultâneas, joelhos semiflexionados.'],
  ['Funcional', 'Wall ball', 'Agache segurando a bola e lance no alvo da parede ao subir.'],
  ['Funcional', 'Turkish get-up', 'Levantar do chão com kettlebell acima da cabeça, em etapas. Técnico.'],
  ['Funcional', 'Polichinelo', 'Aquecimento clássico. Versão sem salto: abra um pé de cada vez.'],
  ['Funcional', 'Agachamento com desenvolvimento usando elástico', 'Pés sobre o elástico. Agache e, ao subir, empurre as mãos acima da cabeça.'],

  // ---------------- Cardio ----------------
  ['Cardio', 'Caminhada na esteira', 'Comece leve e aumente a velocidade aos poucos. Inclinação de 1–2% simula a rua.'],
  ['Cardio', 'Caminhada inclinada na esteira', 'Inclinação 6–12%, ritmo constante. Muito gasto calórico com baixo impacto.'],
  ['Cardio', 'Corrida na esteira', 'Pisada leve, passadas curtas. Faça progressão de tempo antes da velocidade.'],
  ['Cardio', 'Bicicleta ergométrica', 'Banco na altura do quadril, joelho quase estendido embaixo. Cadência 60–90 rpm.'],
  ['Cardio', 'Bicicleta horizontal (reclinada)', 'Encosto nas costas: confortável para quem tem dor lombar, idosos e obesos.'],
  ['Cardio', 'Elíptico (transport)', 'Sem impacto, trabalha braços e pernas juntos.'],
  ['Cardio', 'Remo ergômetro', 'Pernas empurram primeiro, depois tronco e braços. Volta na ordem inversa.'],
  ['Cardio', 'Escada (simulador de escada)', 'Postura ereta, sem apoiar o peso nos braços.'],
  ['Cardio', 'Pular corda', 'Saltos baixos, na ponta dos pés. Alto impacto.'],
  ['Cardio', 'HIIT na bicicleta', 'Ex.: 30 s forte + 90 s leve, 6–10 vezes. Só para quem já tem base de condicionamento.'],
  ['Cardio', 'Natação ou hidroginástica', 'Atividade na água: alivia o impacto nas articulações. Ótima para obesos, idosos e quem tem dor.', 'hidroginástica exercícios'],

  // ---------------- Mobilidade e alongamento ----------------
  ['Mobilidade e alongamento', 'Mobilidade de quadril 90/90', 'Sentado com as duas pernas a 90°. Gire os joelhos de um lado para o outro devagar.'],
  ['Mobilidade e alongamento', 'Gato e camelo (mobilidade de coluna)', 'Em quatro apoios, arredonde e estenda a coluna devagar, acompanhando a respiração.'],
  ['Mobilidade e alongamento', 'Rotação torácica em quatro apoios', 'Mão atrás da cabeça, gire o tronco abrindo o cotovelo para o teto.'],
  ['Mobilidade e alongamento', 'Alongamento de posteriores de coxa', 'Perna estendida, incline o tronco à frente com a coluna reta. Segure 20–30 s.'],
  ['Mobilidade e alongamento', 'Alongamento de quadríceps em pé', 'Segure o pé atrás, joelhos juntos. Apoie-se na parede se precisar.'],
  ['Mobilidade e alongamento', 'Alongamento do flexor do quadril (afundo)', 'Joelho de trás no chão, empurre o quadril à frente. Bom para quem fica muito sentado.'],
  ['Mobilidade e alongamento', 'Alongamento de peitoral na parede', 'Antebraço na parede, gire o corpo para o lado oposto.'],
  ['Mobilidade e alongamento', 'Alongamento de panturrilha na parede', 'Perna de trás estendida, calcanhar no chão.'],
  ['Mobilidade e alongamento', 'Postura da criança', 'Sentado sobre os calcanhares, estenda os braços à frente e relaxe a coluna.'],
  ['Mobilidade e alongamento', 'Mobilidade de tornozelo na parede', 'Leve o joelho em direção à parede sem tirar o calcanhar do chão.'],
  ['Mobilidade e alongamento', 'Liberação miofascial com rolo', 'Role devagar sobre o músculo, parando 20–30 s nos pontos mais sensíveis.'],
  ['Mobilidade e alongamento', 'Círculos de ombro e braços', 'Aquecimento articular: círculos pequenos que vão aumentando.'],

  // ---------------- Idosos ----------------
  ['Idosos', 'Sentar e levantar da cadeira', `Fortalece pernas para o dia a dia. Braços cruzados no peito; se precisar, use as mãos na coxa. ${SEG_IDOSO}`, 'sentar e levantar da cadeira idosos'],
  ['Idosos', 'Marcha estacionária com apoio', `Elevar os joelhos alternadamente segurando no encosto de uma cadeira. ${SEG_IDOSO}`, 'marcha estacionária idosos'],
  ['Idosos', 'Equilíbrio em um pé com apoio', `Segure numa cadeira e fique 10–30 s em um pé. Progrida soltando um dedo de cada vez. ${SEG_IDOSO}`, 'equilíbrio unipodal idosos'],
  ['Idosos', 'Caminhada calcanhar-ponta (em linha)', `Caminhe colocando o calcanhar encostado na ponta do outro pé, perto de uma parede. ${SEG_IDOSO}`, 'caminhada tandem idosos equilíbrio'],
  ['Idosos', 'Panturrilha em pé com apoio', `Suba na ponta dos pés segurando na cadeira. Ajuda no equilíbrio e na caminhada. ${SEG_IDOSO}`, 'elevação de calcanhar idosos'],
  ['Idosos', 'Extensão de joelho sentado', `Sentado, estenda um joelho e segure 2 s. Use caneleira leve para progredir. ${SEG_IDOSO}`, 'extensão de joelho sentado idosos'],
  ['Idosos', 'Abdução de quadril em pé com apoio', `Segurando na cadeira, afaste a perna para o lado sem inclinar o tronco. ${SEG_IDOSO}`, 'abdução de quadril em pé idosos'],
  ['Idosos', 'Flexão de quadril em pé com apoio', `Segurando na cadeira, eleve o joelho à frente até a altura do quadril. ${SEG_IDOSO}`, 'flexão de quadril em pé idosos'],
  ['Idosos', 'Remada sentado com elástico', `Sentado, elástico preso nos pés ou à frente. Puxe juntando as escápulas. ${SEG_IDOSO}`, 'remada com elástico idosos sentado'],
  ['Idosos', 'Desenvolvimento sentado com halteres leves', `Sentado com encosto, suba os pesos sem travar os cotovelos. ${SEG_IDOSO}`, 'desenvolvimento sentado idosos'],
  ['Idosos', 'Rosca bíceps sentado', `Sentado, halteres leves ou garrafas de água. Cotovelos parados. ${SEG_IDOSO}`, 'rosca bíceps sentado idosos'],
  ['Idosos', 'Levantar do chão com apoio (treino de quedas)', `Treina como levantar após uma queda: de lado, quatro apoios, um joelho, e apoio na cadeira para subir. ${SEG_IDOSO}`, 'como levantar do chão idosos'],
  ['Idosos', 'Subida de degrau com apoio', `Suba e desça um degrau baixo segurando no corrimão. ${SEG_IDOSO}`, 'subir degrau idosos exercício'],
  ['Idosos', 'Caminhada com obstáculos baixos', `Passar por cima de objetos baixos (cones, livros) caminhando devagar. Treina passada e atenção. ${SEG_IDOSO}`, 'caminhada com obstáculos idosos'],
  ['Idosos', 'Alcance funcional (inclinar à frente)', `Em pé perto da parede, incline-se para alcançar à frente sem tirar os pés. ${SEG_IDOSO}`, 'alcance funcional idosos'],
  ['Idosos', 'Exercício de preensão com bolinha', `Aperte uma bolinha macia por 3–5 s e solte. Ajuda a força das mãos. ${SEG_IDOSO}`, 'exercício de preensão bolinha idosos'],
  ['Idosos', 'Alongamento sentado na cadeira', `Alongue pescoço, ombros, tronco e pernas sentado, 20–30 s em cada posição. ${SEG_IDOSO}`, 'alongamento na cadeira idosos'],

  // ---------------- Cardiopatas ----------------
  ['Cardiopatas', 'Aquecimento articular leve (5–10 min)', `Sempre antes do treino: círculos de ombros, braços, quadril e tornozelos, com marcha leve. ${SEG_CARD}`, 'aquecimento leve reabilitação cardíaca'],
  ['Cardiopatas', 'Caminhada leve na esteira', `Comece com 10–15 min e aumente aos poucos até 30–40 min. ${SEG_CARD}`, 'caminhada reabilitação cardíaca'],
  ['Cardiopatas', 'Bicicleta ergométrica leve', `Carga baixa e cadência confortável, 10–30 min. ${SEG_CARD}`, 'bicicleta ergométrica reabilitação cardíaca'],
  ['Cardiopatas', 'Bicicleta horizontal leve', `Encosto nas costas e menor sobrecarga. Boa para começar o condicionamento. ${SEG_CARD}`, 'bicicleta horizontal reabilitação cardíaca'],
  ['Cardiopatas', 'Leg press com carga leve', `Carga leve, 12–15 repetições sem esforço máximo. Expire na subida. ${SEG_CARD}`, 'musculação para cardiopatas leg press'],
  ['Cardiopatas', 'Cadeira extensora com carga leve', `12–15 repetições lentas, sem prender o ar. ${SEG_CARD}`, 'musculação cardiopatas cadeira extensora'],
  ['Cardiopatas', 'Remada sentado na máquina leve', `Carga leve, tronco apoiado, respiração contínua. ${SEG_CARD}`, 'musculação para cardiopatas remada'],
  ['Cardiopatas', 'Puxada na frente leve', `Carga leve, sem levar a barra atrás da nuca. ${SEG_CARD}`, 'musculação para cardiopatas puxada'],
  ['Cardiopatas', 'Supino na máquina leve', `Carga leve, sem travar o cotovelo e sem prender o ar. ${SEG_CARD}`, 'musculação para cardiopatas supino máquina'],
  ['Cardiopatas', 'Exercícios com elástico em circuito leve', `Circuito de 4–6 exercícios com elástico, 1 min cada, descanso entre eles. ${SEG_CARD}`, 'circuito com elástico reabilitação cardíaca'],
  ['Cardiopatas', 'Respiração diafragmática', `Inspire pelo nariz enchendo a barriga, expire devagar pela boca. Ótima no início e no fim da sessão. ${SEG_CARD}`, 'respiração diafragmática exercício'],
  ['Cardiopatas', 'Volta à calma e alongamento (5–10 min)', `Reduza a intensidade aos poucos e alongue sem prender o ar. Nunca pare de forma brusca. ${SEG_CARD}`, 'volta à calma alongamento reabilitação cardíaca'],

  // ---------------- Obesidade e baixo impacto ----------------
  ['Obesidade e baixo impacto', 'Caminhada na esteira com inclinação leve', `${SEG_OBES} Comece com 15–20 min.`, 'caminhada inclinada iniciante'],
  ['Obesidade e baixo impacto', 'Bicicleta ergométrica para iniciantes', `${SEG_OBES} Banco bem regulado e carga baixa.`, 'bicicleta ergométrica iniciante obesidade'],
  ['Obesidade e baixo impacto', 'Agachamento na cadeira (sentar e levantar)', `${SEG_OBES} Sente e levante sem impulso. Progrida para uma cadeira mais baixa.`, 'agachamento na cadeira iniciante'],
  ['Obesidade e baixo impacto', 'Leg press 45° leve', `${SEG_OBES} Amplitude confortável, sem tirar a lombar do encosto.`, 'leg press iniciante'],
  ['Obesidade e baixo impacto', 'Flexão na parede ou inclinada no banco', `${SEG_OBES} Mãos na parede ou no banco; quanto mais alto o apoio, mais fácil.`, 'flexão inclinada iniciante'],
  ['Obesidade e baixo impacto', 'Remada na máquina para iniciantes', `${SEG_OBES} Peito apoiado, sem sobrecarregar a lombar.`, 'remada máquina iniciante'],
  ['Obesidade e baixo impacto', 'Puxada na frente para iniciantes', `${SEG_OBES} Carga moderada, foco na técnica.`, 'puxada frontal iniciante'],
  ['Obesidade e baixo impacto', 'Circuito de baixo impacto sem salto', `${SEG_OBES} Ex.: marcha, agachamento na cadeira, remada com elástico, polichinelo sem salto, prancha na parede. 40 s cada.`, 'treino sem impacto em casa iniciante'],
  ['Obesidade e baixo impacto', 'Polichinelo sem salto', `${SEG_OBES} Abra um pé de cada vez levantando os braços.`, 'polichinelo sem salto'],
  ['Obesidade e baixo impacto', 'Marcha com elevação de joelhos', `${SEG_OBES} No lugar, sem impacto, ritmo constante.`, 'marcha estacionária exercício'],
  ['Obesidade e baixo impacto', 'Prancha na parede ou inclinada', `${SEG_OBES} Mãos na parede ou no banco, corpo reto. Mais confortável que a prancha no chão.`, 'prancha inclinada iniciante'],
  ['Obesidade e baixo impacto', 'Elíptico para iniciantes', `${SEG_OBES} Sem impacto, trabalha corpo inteiro.`, 'elíptico iniciante'],
  ['Obesidade e baixo impacto', 'Exercícios na água (hidroginástica)', `${SEG_OBES} A água sustenta parte do peso e protege as articulações.`, 'hidroginástica para obesos'],
  ['Obesidade e baixo impacto', 'Remo ergômetro leve', `${SEG_OBES} Ritmo leve e técnica primeiro: pernas, tronco e braços.`, 'remo ergômetro iniciante'],
  // ---------------- Adolescentes (12+ anos) ----------------
  ['Adolescentes (12+ anos)', 'Agachamento com peso do corpo', `${SEG_TEEN} Base do treino de pernas: pés na largura dos ombros, quadril para trás, joelhos na direção dos pés.`, 'agachamento livre peso corporal iniciante'],
  ['Adolescentes (12+ anos)', 'Agachamento goblet com carga leve', `${SEG_TEEN} Próximo passo depois do agachamento sem peso: halter leve junto ao peito, tronco firme.`, 'agachamento goblet iniciante'],
  ['Adolescentes (12+ anos)', 'Passada sem carga', `${SEG_TEEN} Passo à frente e joelho de trás desce em direção ao chão. Trabalha força e equilíbrio.`, 'passada afundo iniciante'],
  ['Adolescentes (12+ anos)', 'Ponte de glúteo com uma perna', `${SEG_TEEN} Deitado, uma perna estendida no ar: suba o quadril sem girar a bacia.`, 'ponte de glúteo unilateral'],
  ['Adolescentes (12+ anos)', 'Flexão de braço inclinada no banco', `${SEG_TEEN} Mãos no banco, corpo reto. Quando fizer 15 repetições perfeitas, passe para o chão.`, 'flexão inclinada no banco'],
  ['Adolescentes (12+ anos)', 'Remada invertida na barra baixa', `${SEG_TEEN} Deitado sob uma barra baixa (Smith), puxe o peito até a barra com o corpo reto. Prepara para a barra fixa.`, 'remada invertida australiana'],
  ['Adolescentes (12+ anos)', 'Puxada na frente com carga leve', `${SEG_TEEN} Puxe a barra até o alto do peito, sem jogar o tronco para trás.`, 'puxada frontal iniciante'],
  ['Adolescentes (12+ anos)', 'Supino com halteres leves', `${SEG_TEEN} Halteres leves e controle total na descida. Com halteres cada braço trabalha por igual.`, 'supino com halteres iniciante'],
  ['Adolescentes (12+ anos)', 'Desenvolvimento com halteres leves (em pé)', `${SEG_TEEN} Abdômen firme e sem arquear a lombar ao subir os pesos.`, 'desenvolvimento com halteres em pé iniciante'],
  ['Adolescentes (12+ anos)', 'Dobradiça de quadril com bastão', `${SEG_TEEN} Bastão encostado na cabeça, costas e quadril: incline o tronco levando o quadril para trás sem perder o contato. Ensina o movimento do levantamento terra.`, 'hip hinge com bastão'],
  ['Adolescentes (12+ anos)', 'Levantamento terra com kettlebell leve', `${SEG_TEEN} Só depois de dominar a dobradiça de quadril. Coluna neutra, empurre o chão com os pés.`, 'levantamento terra kettlebell iniciante'],
  ['Adolescentes (12+ anos)', 'Arremesso de medicine ball no peito', `${SEG_TEEN} Bola leve (1–3 kg), lance contra a parede ou para um colega. Desenvolve potência de forma segura.`, 'arremesso medicine ball peito parede'],
  ['Adolescentes (12+ anos)', 'Arremesso de medicine ball no chão', `${SEG_TEEN} Bola leve acima da cabeça e lance no chão com força, agachando junto.`, 'medicine ball slam'],
  ['Adolescentes (12+ anos)', 'Saltos com aterrissagem controlada', `${SEG_TEEN} Salte e aterrisse suave, joelhos flexionados e alinhados aos pés. Saltos fortalecem os ossos em crescimento; poucas repetições, com descanso.`, 'saltos aterrissagem correta'],
  ['Adolescentes (12+ anos)', 'Salto lateral sobre linha', `${SEG_TEEN} Saltos rápidos de um lado para o outro de uma linha no chão. Coordenação e agilidade.`, 'saltos laterais agilidade'],
  ['Adolescentes (12+ anos)', 'Escada de agilidade', `${SEG_TEEN} Padrões de passos na escada no chão (dentro, fora, lateral). Coordenação e velocidade de pés.`, 'escada de agilidade exercícios'],
  ['Adolescentes (12+ anos)', 'Corrida com mudança de direção', `${SEG_TEEN} Corrida curta entre cones, freando e mudando de direção com o corpo baixo.`, 'corrida mudança de direção cones'],
  ['Adolescentes (12+ anos)', 'Caminhada do urso', `${SEG_TEEN} Quatro apoios com joelhos um pouco acima do chão, caminhe à frente e para trás. Força geral e coordenação.`, 'bear crawl exercício'],
  ['Adolescentes (12+ anos)', 'Caminhada do caranguejo', `${SEG_TEEN} Mãos e pés no chão, barriga para cima, quadril alto. Ombros, glúteos e coordenação.`, 'caminhada do caranguejo exercício'],
  ['Adolescentes (12+ anos)', 'Prancha com toque no ombro', `${SEG_TEEN} Em prancha alta, toque o ombro oposto sem deixar o quadril balançar.`, 'prancha com toque no ombro'],
  ['Adolescentes (12+ anos)', 'Equilíbrio em um pé com alcance', `${SEG_TEEN} Em um pé, incline e alcance pontos à frente e aos lados. Previne lesões de tornozelo e joelho.`, 'equilíbrio unipodal com alcance'],
  ['Adolescentes (12+ anos)', 'Pular corda (iniciante)', `${SEG_TEEN} Séries curtas de 20–30 s, saltos baixos na ponta dos pés.`, 'pular corda iniciante'],
];

await sql`alter table exercise_library add column if not exists category text`;

let novos = 0, completados = 0;
for (const [cat, name, notes, termo] of L) {
  const url = yt(`${termo ?? name} execução correta`);
  const [r] = await sql`
    insert into exercise_library (name, video_url, notes, category) values (${name}, ${url}, ${notes}, ${cat})
    on conflict (name) do update set
      category = coalesce(exercise_library.category, excluded.category),
      video_url = coalesce(exercise_library.video_url, excluded.video_url)
    returning (xmax = 0) as inserted`;
  r.inserted ? novos++ : completados++;
}
const [{ n }] = await sql`select count(*)::int as n from exercise_library`;
console.log(`${L.length} na lista · ${novos} novos · ${completados} já existiam (categoria/link preenchidos se vazios) · total na biblioteca: ${n}`);
