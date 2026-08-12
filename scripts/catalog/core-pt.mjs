/**
 * Conteúdo curado em português para o núcleo do catálogo.
 *
 * ## Por que só o núcleo
 *
 * A base de origem traz 3.011 frases distintas de instrução em inglês.
 * Traduzi-las por dicionário produziria português quebrado — pior que o
 * original, porque *parece* conteúdo próprio. E traduzir 3.011 frases à mão não
 * é trabalho de uma entrega.
 *
 * A saída honesta é a assimetria: os exercícios que o gerador **prescreve**
 * (estes) recebem execução, dicas e erros comuns escritos em português; os
 * outros 800 entram como biblioteca pesquisável, com nome traduzido, imagens da
 * demonstração e a descrição original claramente rotulada como sendo em inglês.
 *
 * `externalId` liga o exercício já existente no banco à entrada da base de
 * origem, para **enriquecer em vez de duplicar** — o histórico de treino do
 * usuário aponta para esses `exercise_id`, e criar cópias novas o quebraria.
 *
 * `cadence` segue o formato excêntrica-pausa-concêntrica-pausa e só aparece
 * onde o tempo sob tensão muda o resultado.
 */

export const CORE_PT = {
  "Supino Reto com Barra": {
    externalId: "Barbell_Bench_Press_-_Medium_Grip",
    cadence: "2-1-1-0",
    execution: [
      "Deite no banco com os pés firmes no chão e os olhos sob a barra.",
      "Retraia as escápulas e mantenha uma leve arqueada natural na lombar.",
      "Pegue a barra pouco mais aberto que a largura dos ombros e retire do suporte.",
      "Desça controlado até tocar a linha dos mamilos, cotovelos a cerca de 45° do tronco.",
      "Empurre a barra de volta sem travar os cotovelos no topo.",
    ],
    cues: [
      "Escápulas retraídas e presas ao banco",
      "Pés empurrando o chão",
      "Cotovelos a 45°, nunca abertos a 90°",
    ],
    mistakes: [
      "Quicar a barra no peito",
      "Levantar o quadril do banco",
      "Abrir os cotovelos em linha com os ombros",
    ],
  },
  "Supino Inclinado com Barra": {
    externalId: "Barbell_Incline_Bench_Press_-_Medium_Grip",
    cadence: "2-1-1-0",
    execution: [
      "Ajuste o banco entre 30° e 45° — acima disso o ombro assume o trabalho.",
      "Retraia as escápulas e mantenha os pés apoiados.",
      "Desça a barra até a parte alta do peito, logo abaixo das clavículas.",
      "Empurre em linha reta acima da articulação do ombro.",
    ],
    cues: ["Inclinação de 30° a 45°", "Barra desce alta, no peitoral superior"],
    mistakes: [
      "Inclinar demais o banco e virar desenvolvimento",
      "Descer a barra na linha do supino reto",
    ],
  },
  "Supino Reto com Halteres": {
    externalId: "Dumbbell_Bench_Press",
    cadence: "3-1-1-0",
    execution: [
      "Sente no banco com os halteres apoiados nas coxas e deite impulsionando-os.",
      "Posicione os halteres na linha do peito, palmas voltadas para frente.",
      "Desça até sentir alongamento no peitoral, sem forçar o ombro.",
      "Empurre juntando levemente os halteres no topo, sem batê-los.",
    ],
    cues: ["Amplitude maior que a barra — aproveite-a", "Punhos alinhados com os antebraços"],
    mistakes: ["Descer além do confortável para o ombro", "Bater os halteres no topo"],
  },
  "Supino Inclinado com Halteres": {
    externalId: "Incline_Dumbbell_Press",
    cadence: "3-1-1-0",
    execution: [
      "Ajuste o banco entre 30° e 45°.",
      "Suba os halteres até a linha do peito superior, palmas para frente.",
      "Desça controlado até o alongamento do peitoral.",
      "Empurre para cima e ligeiramente para dentro.",
    ],
    cues: ["Escápulas presas ao banco durante todo o movimento"],
    mistakes: ["Deixar o ombro rolar para frente na descida"],
  },
  "Crucifixo com Halteres": {
    externalId: "Dumbbell_Flyes",
    cadence: "3-1-1-0",
    execution: [
      "Deite no banco com os halteres estendidos acima do peito, palmas frente a frente.",
      "Mantenha uma flexão fixa de cotovelo — o ângulo não muda durante a série.",
      "Abra os braços em arco até sentir o peitoral alongar.",
      "Feche pelo mesmo caminho, como se abraçasse um barril.",
    ],
    cues: ["Cotovelo com flexão fixa, nunca estendido", "Movimento em arco, não em linha reta"],
    mistakes: [
      "Transformar em supino dobrando e estendendo o cotovelo",
      "Usar carga que force amplitude excessiva",
    ],
  },
  "Crossover no Cabo": {
    externalId: "Cable_Crossover",
    cadence: "2-1-1-1",
    execution: [
      "Posicione as polias acima da linha dos ombros e segure as manoplas.",
      "Dê um passo à frente com o tronco levemente inclinado.",
      "Traga as mãos para frente e para baixo, cruzando levemente na frente do corpo.",
      "Retorne controlado até sentir o alongamento, sem perder a tensão.",
    ],
    cues: [
      "Pausa de um segundo no ponto de maior contração",
      "Tensão contínua — o cabo não descansa",
    ],
    mistakes: ["Usar o tronco para puxar", "Soltar a carga de volta sem controle"],
  },
  "Peck Deck": {
    externalId: "Butterfly",
    cadence: "2-1-1-1",
    execution: [
      "Ajuste o banco para que as manoplas fiquem na altura do peito.",
      "Encoste as costas no apoio e mantenha os ombros baixos.",
      "Feche os braços até quase encostar as manoplas.",
      "Volte controlado, sem deixar o peso bater na pilha.",
    ],
    cues: ["Ombros para trás e para baixo"],
    mistakes: ["Levantar os ombros durante a contração"],
  },
  "Flexão de Braço": {
    externalId: "Pushups",
    cadence: "2-0-1-0",
    execution: [
      "Apoie as mãos no chão pouco mais abertas que os ombros.",
      "Mantenha corpo em linha reta: cabeça, quadril e calcanhares alinhados.",
      "Desça até o peito quase tocar o chão, cotovelos a 45°.",
      "Empurre o chão para longe até estender os cotovelos.",
    ],
    cues: ["Glúteo e abdômen contraídos o tempo todo", "Cotovelos a 45°, não abertos"],
    mistakes: ["Deixar o quadril cair", "Descer só metade da amplitude"],
  },
  "Mergulho no Paralelo": {
    externalId: "Dips_-_Chest_Version",
    cadence: "3-0-1-0",
    execution: [
      "Segure as barras paralelas e suba até estender os cotovelos.",
      "Incline o tronco à frente para enfatizar o peitoral.",
      "Desça até os ombros ficarem na linha dos cotovelos — não além.",
      "Empurre de volta ao topo mantendo a inclinação.",
    ],
    cues: ["Tronco inclinado para peito, ereto para tríceps"],
    mistakes: ["Descer demais e comprometer o ombro", "Balançar as pernas para ganhar impulso"],
  },

  "Agachamento Livre": {
    externalId: "Barbell_Squat",
    cadence: "3-0-1-0",
    execution: [
      "Posicione a barra sobre o trapézio, não sobre o pescoço.",
      "Pés na largura dos ombros, pontas levemente para fora.",
      "Inspire, contraia o abdômen e desça empurrando o quadril para trás.",
      "Desça até as coxas ficarem paralelas ao chão ou até onde mantiver a lombar neutra.",
      "Suba empurrando o chão, joelhos acompanhando a direção dos pés.",
    ],
    cues: [
      "Abdômen contraído como se fosse levar um soco",
      "Joelho na direção do dedão",
      "Peito aberto",
    ],
    mistakes: [
      "Joelhos colapsando para dentro",
      "Perder a neutralidade da lombar no fundo",
      "Subir com o quadril antes do tronco",
    ],
  },
  "Agachamento Frontal": {
    externalId: "Front_Barbell_Squat",
    cadence: "3-0-1-0",
    execution: [
      "Apoie a barra sobre os deltoides frontais, cotovelos bem altos.",
      "Pés na largura dos ombros, tronco o mais vertical possível.",
      "Desça mantendo os cotovelos apontados para frente.",
      "Suba sem deixar o tronco cair à frente.",
    ],
    cues: ["Cotovelos altos — se caírem, a barra cai", "Tronco vertical"],
    mistakes: ["Deixar os cotovelos baixarem", "Usar carga do agachamento livre"],
  },
  "Leg Press 45°": {
    externalId: "Leg_Press",
    cadence: "3-0-1-0",
    execution: [
      "Sente com as costas e o quadril totalmente apoiados.",
      "Pés na plataforma na largura dos ombros, na altura média.",
      "Destrave e desça até cerca de 90° de flexão de joelho.",
      "Empurre sem travar os joelhos no topo.",
    ],
    cues: ["Lombar sempre colada no apoio"],
    mistakes: ["Descer até o quadril descolar do banco", "Travar os joelhos na extensão"],
  },
  "Cadeira Extensora": {
    externalId: "Leg_Extensions",
    cadence: "2-1-1-1",
    execution: [
      "Ajuste o encosto para que o joelho fique alinhado com o eixo da máquina.",
      "Estenda as pernas até quase a extensão completa.",
      "Segure um segundo no topo e desça controlado.",
    ],
    cues: ["Pausa no topo", "Descida lenta"],
    mistakes: ["Usar impulso do tronco", "Soltar o peso na volta"],
  },
  "Cadeira Flexora": {
    externalId: "Seated_Leg_Curl",
    cadence: "2-1-1-1",
    execution: [
      "Ajuste o apoio logo acima do tendão de Aquiles.",
      "Flexione os joelhos puxando o apoio para baixo e para trás.",
      "Retorne controlado sem estender totalmente.",
    ],
    cues: ["Quadril colado no assento"],
    mistakes: ["Levantar o quadril para ganhar amplitude"],
  },
  "Mesa Flexora": {
    externalId: "Lying_Leg_Curls",
    cadence: "2-1-1-1",
    execution: [
      "Deite de bruços com o apoio logo acima dos calcanhares.",
      "Flexione os joelhos trazendo os calcanhares em direção aos glúteos.",
      "Desça controlado até quase estender.",
    ],
    cues: ["Quadril pressionado contra o banco"],
    mistakes: ["Levantar o quadril no pico da contração"],
  },
  Stiff: {
    externalId: "Stiff-Legged_Barbell_Deadlift",
    cadence: "3-1-1-0",
    execution: [
      "Segure a barra na largura dos ombros, joelhos quase estendidos.",
      "Empurre o quadril para trás descendo a barra rente às pernas.",
      "Desça até sentir o alongamento do posterior, lombar neutra.",
      "Volte contraindo glúteos e posteriores.",
    ],
    cues: ["Barra sempre rente ao corpo", "O movimento é do quadril, não da coluna"],
    mistakes: ["Arredondar a lombar", "Afastar a barra das pernas"],
  },
  "Levantamento Terra": {
    externalId: "Barbell_Deadlift",
    cadence: "2-0-1-1",
    execution: [
      "Pés sob a barra na largura do quadril; a barra toca a canela.",
      "Flexione o quadril e os joelhos para pegar a barra fora das pernas.",
      "Peito aberto, lombar neutra, ombros ligeiramente à frente da barra.",
      "Empurre o chão com os pés e estenda quadril e joelhos ao mesmo tempo.",
      "Finalize em pé, sem hiperestender a lombar.",
    ],
    cues: [
      "Empurre o chão, não puxe a barra",
      "Barra rente ao corpo o tempo todo",
      "Abdômen travado antes de sair do chão",
    ],
    mistakes: ["Levantar o quadril antes do peito", "Arredondar a coluna", "Hiperestender no topo"],
  },
  "Terra Romeno": {
    externalId: "Romanian_Deadlift",
    cadence: "3-1-1-0",
    execution: [
      "Comece em pé com a barra na frente das coxas.",
      "Mantenha uma leve flexão de joelho fixa durante todo o movimento.",
      "Empurre o quadril para trás descendo a barra rente às pernas.",
      "Pare quando a lombar começar a perder a neutralidade e volte.",
    ],
    cues: [
      "Quadril para trás, não para baixo",
      "Amplitude limitada pelo posterior, não pela coluna",
    ],
    mistakes: ["Agachar em vez de flexionar o quadril", "Descer além da amplitude segura"],
  },
  Avanço: {
    externalId: "Dumbbell_Lunges",
    cadence: "2-0-1-0",
    execution: [
      "Em pé com um halter em cada mão, dê um passo à frente.",
      "Desça até o joelho de trás quase tocar o chão.",
      "O joelho da frente fica alinhado com o pé, sem ultrapassá-lo muito.",
      "Empurre com o calcanhar da frente para voltar.",
    ],
    cues: ["Tronco ereto", "Passo longo para glúteo, curto para quadríceps"],
    mistakes: ["Passo curto demais sobrecarregando o joelho", "Inclinar o tronco à frente"],
  },
  Búlgaro: {
    externalId: "Split_Squat_with_Dumbbells",
    cadence: "3-0-1-0",
    execution: [
      "Apoie o peito do pé de trás num banco na altura do joelho.",
      "Dê um passo à frente suficiente para o joelho da frente ficar sobre o tornozelo.",
      "Desça verticalmente até a coxa da frente ficar paralela ao chão.",
      "Suba empurrando o calcanhar da frente.",
    ],
    cues: ["O trabalho é da perna da frente — a de trás só equilibra"],
    mistakes: ["Empurrar com a perna de trás", "Passo curto que joga o joelho à frente"],
  },
  "Hip Thrust": {
    externalId: "Barbell_Hip_Thrust",
    cadence: "2-1-1-1",
    execution: [
      "Apoie as escápulas na borda de um banco, barra sobre o quadril.",
      "Pés na largura do quadril, calcanhares sob os joelhos.",
      "Estenda o quadril até o tronco ficar paralelo ao chão.",
      "Segure um segundo no topo contraindo os glúteos e desça controlado.",
    ],
    cues: ["Queixo para baixo, costelas fechadas", "Pausa de um segundo no topo"],
    mistakes: [
      "Hiperestender a lombar em vez do quadril",
      "Pés longe demais, transferindo para o posterior",
    ],
  },
  "Elevação Pélvica": {
    externalId: "Butt_Lift_Bridge",
    cadence: "2-1-1-1",
    execution: [
      "Deite de costas, joelhos flexionados e pés apoiados.",
      "Empurre os calcanhares no chão e eleve o quadril.",
      "Contraia os glúteos no topo e desça sem encostar totalmente.",
    ],
    cues: ["Empurre pelos calcanhares"],
    mistakes: ["Arquear a lombar para ganhar altura"],
  },
  "Panturrilha em Pé": {
    externalId: "Standing_Calf_Raises",
    cadence: "3-1-1-1",
    execution: [
      "Apoie a ponta dos pés na plataforma, calcanhares livres.",
      "Desça o calcanhar até o alongamento máximo.",
      "Suba na ponta dos pés o mais alto possível e segure um segundo.",
    ],
    cues: ["Amplitude completa: alongar embaixo, contrair em cima", "Joelhos estendidos"],
    mistakes: ["Fazer repetições curtas e rápidas", "Flexionar o joelho para ganhar impulso"],
  },
  "Panturrilha Sentado": {
    externalId: "Seated_Calf_Raise",
    cadence: "3-1-1-1",
    execution: [
      "Sente com a ponta dos pés na plataforma e o apoio sobre as coxas.",
      "Desça o calcanhar até alongar e suba o mais alto possível.",
    ],
    cues: ["Sentado enfatiza o sóleo — cadência lenta rende mais aqui"],
    mistakes: ["Amplitude parcial"],
  },

  "Barra Fixa (Pull-up)": {
    externalId: "Pullups",
    cadence: "3-0-1-1",
    execution: [
      "Segure a barra com pegada pronada, pouco mais aberta que os ombros.",
      "Comece pendurado com os braços estendidos e as escápulas ativas.",
      "Puxe o peito em direção à barra levando os cotovelos para baixo e para trás.",
      "Desça controlado até a extensão completa.",
    ],
    cues: ["Puxe com os cotovelos, não com as mãos", "Peito para a barra"],
    mistakes: ["Balançar o corpo para ganhar impulso", "Não descer até estender"],
  },
  "Barra Fixa Pegada Supinada": {
    externalId: "Chin-Up",
    cadence: "3-0-1-1",
    execution: [
      "Segure a barra com pegada supinada na largura dos ombros.",
      "Puxe até o queixo passar da barra.",
      "Desça controlado até estender os cotovelos.",
    ],
    cues: ["Pegada supinada recruta mais bíceps que a pronada"],
    mistakes: ["Usar impulso de quadril"],
  },
  "Puxada na Frente": {
    externalId: "Wide-Grip_Lat_Pulldown",
    cadence: "2-1-1-1",
    execution: [
      "Ajuste o apoio das coxas para o corpo não subir.",
      "Segure a barra pouco mais aberto que os ombros.",
      "Incline o tronco levemente para trás e puxe a barra até a parte alta do peito.",
      "Retorne controlado até estender os braços.",
    ],
    cues: ["Escápulas descem antes dos braços puxarem", "Peito para cima"],
    mistakes: ["Puxar atrás da nuca", "Deitar o tronco para trás usando o peso do corpo"],
  },
  "Puxada Aberta": {
    externalId: "Wide-Grip_Rear_Pull-Up",
    cadence: "2-1-1-1",
    execution: [
      "Pegada bem aberta na barra, apoio das coxas ajustado.",
      "Puxe até a parte alta do peito mantendo o tronco quase vertical.",
      "Volte controlado.",
    ],
    cues: ["Pegada aberta enfatiza a largura do dorsal"],
    mistakes: ["Reduzir a amplitude por excesso de carga"],
  },
  "Remada Curvada com Barra": {
    externalId: "Bent_Over_Barbell_Row",
    cadence: "2-1-1-1",
    execution: [
      "Segure a barra na largura dos ombros, joelhos levemente flexionados.",
      "Incline o tronco até cerca de 45°, lombar neutra.",
      "Puxe a barra em direção ao umbigo levando os cotovelos para trás.",
      "Desça controlado sem deixar o tronco subir.",
    ],
    cues: [
      "Tronco fixo — o movimento é só dos braços e escápulas",
      "Barra vai ao umbigo, não ao peito",
    ],
    mistakes: ["Subir o tronco a cada repetição", "Arredondar a lombar"],
  },
  "Remada Cavalinho": {
    externalId: "T-Bar_Row_with_Handle",
    cadence: "2-1-1-1",
    execution: [
      "Posicione-se sobre a barra com o tronco inclinado e o peito apoiado, se houver apoio.",
      "Puxe a manopla em direção ao abdômen.",
      "Retorne até o alongamento das escápulas.",
    ],
    cues: ["Aperte as escápulas no fim do movimento"],
    mistakes: ["Usar impulso de quadril"],
  },
  "Remada Baixa Cabo": {
    externalId: "Seated_Cable_Rows",
    cadence: "2-1-1-1",
    execution: [
      "Sente com os pés apoiados e os joelhos levemente flexionados.",
      "Segure a manopla e mantenha o tronco ereto.",
      "Puxe em direção ao abdômen levando os cotovelos rentes ao corpo.",
      "Volte até alongar as escápulas sem arredondar a lombar.",
    ],
    cues: ["Tronco estável, sem balanço para frente e para trás"],
    mistakes: ["Usar o tronco como alavanca", "Encolher os ombros na puxada"],
  },
  "Remada Unilateral com Halter": {
    externalId: "One-Arm_Dumbbell_Row",
    cadence: "2-1-1-1",
    execution: [
      "Apoie joelho e mão do mesmo lado num banco.",
      "Segure o halter com o braço estendido, coluna paralela ao chão.",
      "Puxe o halter em direção ao quadril, cotovelo rente ao corpo.",
      "Desça controlado até estender.",
    ],
    cues: ["Ombro do lado que trabalha desce e vem para trás"],
    mistakes: ["Rotacionar o tronco para ganhar amplitude"],
  },
  "Pullover com Halter": {
    externalId: "Straight-Arm_Dumbbell_Pullover",
    cadence: "3-1-1-0",
    execution: [
      "Deite no banco segurando um halter com as duas mãos acima do peito.",
      "Com os cotovelos levemente flexionados, leve o halter para trás da cabeça.",
      "Volte até a posição inicial contraindo o dorsal.",
    ],
    cues: ["Costelas fechadas — não deixe a lombar arquear"],
    mistakes: ["Dobrar os cotovelos e virar extensão de tríceps"],
  },
  "Encolhimento com Halteres": {
    externalId: "Dumbbell_Shrug",
    cadence: "2-1-1-1",
    execution: [
      "Em pé, um halter em cada mão ao lado do corpo.",
      "Eleve os ombros em direção às orelhas sem flexionar os cotovelos.",
      "Segure no topo e desça controlado.",
    ],
    cues: ["Movimento vertical puro"],
    mistakes: ["Rolar os ombros — não adiciona estímulo e desgasta a articulação"],
  },
  "Encolhimento com Barra": {
    externalId: "Barbell_Shrug",
    cadence: "2-1-1-1",
    execution: [
      "Segure a barra à frente das coxas.",
      "Eleve os ombros verticalmente e segure.",
      "Desça controlado.",
    ],
    cues: ["Braços apenas seguram o peso"],
    mistakes: ["Usar impulso de joelho"],
  },
  "Face Pull": {
    externalId: "Face_Pull",
    cadence: "2-1-1-1",
    execution: [
      "Ajuste a polia na altura do rosto com a corda.",
      "Puxe a corda em direção à testa separando as mãos.",
      "Termine com os cotovelos altos e as escápulas retraídas.",
    ],
    cues: ["Cotovelos acima da linha dos punhos", "Rotação externa no fim"],
    mistakes: ["Puxar para o peito em vez do rosto", "Carga alta que vira remada alta"],
  },

  "Desenvolvimento com Barra": {
    externalId: "Barbell_Shoulder_Press",
    cadence: "2-1-1-0",
    execution: [
      "Segure a barra pouco mais aberto que os ombros, na altura das clavículas.",
      "Contraia abdômen e glúteos para estabilizar o tronco.",
      "Empurre a barra acima da cabeça, passando o rosto.",
      "Termine com a barra alinhada sobre a cabeça e desça controlado.",
    ],
    cues: ["Costelas fechadas — não arqueie a lombar", "Cabeça recua na subida e volta no topo"],
    mistakes: ["Arquear a lombar para completar a repetição", "Empurrar à frente do corpo"],
  },
  "Desenvolvimento com Halteres": {
    externalId: "Dumbbell_Shoulder_Press",
    cadence: "2-1-1-0",
    execution: [
      "Sente com as costas apoiadas e os halteres na altura das orelhas.",
      "Empurre para cima até quase estender os cotovelos.",
      "Desça controlado até a altura das orelhas.",
    ],
    cues: ["Punhos empilhados sobre os cotovelos"],
    mistakes: ["Descer demais e forçar o manguito"],
  },
  "Desenvolvimento Arnold": {
    externalId: "Arnold_Dumbbell_Press",
    cadence: "2-1-1-0",
    execution: [
      "Comece com os halteres à frente do rosto, palmas voltadas para você.",
      "Gire as palmas para fora enquanto empurra para cima.",
      "Retorne fazendo o caminho inverso.",
    ],
    cues: ["A rotação é gradual, acompanhando a subida"],
    mistakes: ["Girar tudo no início e virar desenvolvimento comum"],
  },
  "Elevação Lateral": {
    externalId: "Side_Lateral_Raise",
    cadence: "2-1-1-1",
    execution: [
      "Em pé, halteres ao lado do corpo, cotovelos levemente flexionados.",
      "Eleve os braços lateralmente até a altura dos ombros.",
      "Desça controlado sem deixar o peso cair.",
    ],
    cues: ["Cotovelo sobe antes da mão", "Pare na altura do ombro"],
    mistakes: ["Usar impulso de tronco", "Subir acima dos ombros e recrutar trapézio"],
  },
  "Elevação Frontal": {
    externalId: "Front_Dumbbell_Raise",
    cadence: "2-1-1-1",
    execution: [
      "Halteres à frente das coxas, palmas para baixo.",
      "Eleve um braço de cada vez até a altura do ombro.",
      "Desça controlado.",
    ],
    cues: ["Tronco imóvel"],
    mistakes: ["Balançar o corpo para iniciar o movimento"],
  },
  "Crucifixo Invertido": {
    externalId: "Reverse_Flyes",
    cadence: "2-1-1-1",
    execution: [
      "Incline o tronco à frente com os halteres pendurados.",
      "Abra os braços lateralmente com os cotovelos levemente flexionados.",
      "Contraia as escápulas no topo e desça controlado.",
    ],
    cues: ["Pense em separar as escápulas, não em levantar peso"],
    mistakes: ["Usar carga que force o tronco a subir"],
  },

  "Rosca Direta com Barra": {
    externalId: "Barbell_Curl",
    cadence: "2-1-1-1",
    execution: [
      "Em pé, barra com pegada supinada na largura dos ombros.",
      "Cotovelos junto ao tronco, flexione levando a barra até o peito.",
      "Desça controlado até estender os cotovelos.",
    ],
    cues: ["Cotovelos fixos ao lado do corpo", "Descida lenta"],
    mistakes: ["Balançar o tronco", "Deixar os cotovelos irem à frente"],
  },
  "Rosca Direta com Halteres": {
    externalId: "Dumbbell_Bicep_Curl",
    cadence: "2-1-1-1",
    execution: [
      "Em pé com um halter em cada mão, palmas para frente.",
      "Flexione os cotovelos mantendo-os junto ao tronco.",
      "Desça controlado até a extensão completa.",
    ],
    cues: ["Supine o punho no topo para contração máxima"],
    mistakes: ["Encurtar a amplitude na descida"],
  },
  "Rosca Alternada": {
    externalId: "Alternate_Incline_Dumbbell_Curl",
    cadence: "2-1-1-1",
    execution: ["Alterne os braços, um de cada vez.", "Complete a amplitude antes de trocar."],
    cues: ["Um braço trabalha, o outro descansa estendido"],
    mistakes: ["Iniciar o segundo braço antes de terminar o primeiro"],
  },
  "Rosca Martelo": {
    externalId: "Hammer_Curls",
    cadence: "2-1-1-1",
    execution: [
      "Halteres com pegada neutra, palmas voltadas uma para a outra.",
      "Flexione mantendo a pegada neutra durante todo o movimento.",
      "Desça controlado.",
    ],
    cues: ["Pegada neutra recruta o braquial e o antebraço"],
    mistakes: ["Girar o punho e virar rosca direta"],
  },
  "Rosca Scott": {
    externalId: "Preacher_Curl",
    cadence: "3-1-1-1",
    execution: [
      "Apoie a parte de trás dos braços no banco Scott.",
      "Flexione os cotovelos até o topo.",
      "Desça lentamente até quase estender — nunca solte o peso no fim.",
    ],
    cues: ["A descida é a parte que rende mais aqui"],
    mistakes: ["Estender bruscamente no fim da repetição"],
  },
  "Rosca Concentrada": {
    externalId: "Concentration_Curls",
    cadence: "2-1-1-1",
    execution: [
      "Sente e apoie o cotovelo na parte interna da coxa.",
      "Flexione o cotovelo levando o halter ao ombro.",
      "Desça controlado até estender.",
    ],
    cues: ["Cotovelo imóvel na coxa"],
    mistakes: ["Usar o ombro para ajudar"],
  },
  "Tríceps Testa": {
    externalId: "Lying_Triceps_Press",
    cadence: "3-1-1-0",
    execution: [
      "Deite com a barra estendida acima do peito.",
      "Flexione apenas os cotovelos, levando a barra à testa.",
      "Estenda de volta sem mover os ombros.",
    ],
    cues: ["Braços fixos, apontando para o teto"],
    mistakes: ["Mover o ombro e virar pullover"],
  },
  "Tríceps Corda": {
    externalId: "Triceps_Pushdown_-_Rope_Attachment",
    cadence: "2-1-1-1",
    execution: [
      "Segure a corda na polia alta, cotovelos junto ao tronco.",
      "Estenda os cotovelos separando as pontas da corda no fim.",
      "Volte controlado sem deixar os cotovelos subirem.",
    ],
    cues: ["Abra a corda no fim para contração máxima"],
    mistakes: ["Deixar os cotovelos se afastarem do corpo"],
  },
  "Tríceps Barra": {
    externalId: "Triceps_Pushdown",
    cadence: "2-1-1-1",
    execution: [
      "Segure a barra na polia alta com pegada pronada.",
      "Estenda os cotovelos até o fim.",
      "Volte controlado.",
    ],
    cues: ["Cotovelos travados ao lado do tronco"],
    mistakes: ["Inclinar o tronco para empurrar com o peso do corpo"],
  },
  "Tríceps Francês": {
    externalId: "Seated_Triceps_Press",
    cadence: "3-1-1-0",
    execution: [
      "Sentado, segure um halter com as duas mãos acima da cabeça.",
      "Flexione os cotovelos levando o halter atrás da cabeça.",
      "Estenda de volta sem abrir os cotovelos.",
    ],
    cues: ["Cotovelos apontados para frente, não para os lados"],
    mistakes: ["Abrir os cotovelos e perder tensão no tríceps"],
  },
  "Mergulho entre Bancos": {
    externalId: "Bench_Dips",
    cadence: "3-0-1-0",
    execution: [
      "Apoie as mãos na borda de um banco atrás do corpo.",
      "Desça flexionando os cotovelos até cerca de 90°.",
      "Empurre de volta ao topo.",
    ],
    cues: ["Cotovelos para trás, não para os lados"],
    mistakes: ["Descer demais e forçar o ombro"],
  },

  "Abdominal Supra": {
    externalId: "Crunches",
    cadence: "2-1-1-1",
    execution: [
      "Deite com joelhos flexionados e mãos ao lado da cabeça.",
      "Enrole a coluna trazendo as costelas em direção ao quadril.",
      "Desça controlado sem encostar totalmente.",
    ],
    cues: ["Enrolar, não puxar o pescoço"],
    mistakes: ["Puxar a cabeça com as mãos"],
  },
  "Abdominal Infra": {
    externalId: "Flat_Bench_Lying_Leg_Raise",
    cadence: "2-1-1-1",
    execution: [
      "Deite com as mãos sob o quadril.",
      "Eleve as pernas estendidas até a vertical.",
      "Desça controlado sem deixar a lombar descolar.",
    ],
    cues: ["Lombar sempre em contato com o chão"],
    mistakes: ["Descer as pernas além do que a lombar suporta"],
  },
  Prancha: {
    externalId: "Plank",
    execution: [
      "Apoie antebraços e pontas dos pés no chão.",
      "Alinhe cabeça, quadril e calcanhares.",
      "Contraia abdômen e glúteos e sustente.",
    ],
    cues: ["Quadril nem alto nem baixo", "Respire normalmente"],
    mistakes: ["Deixar o quadril cair", "Prender a respiração"],
  },
  "Prancha Lateral": {
    externalId: "Side_Bridge",
    execution: [
      "Deite de lado apoiado no antebraço, cotovelo sob o ombro.",
      "Eleve o quadril até alinhar o corpo.",
      "Sustente e troque de lado.",
    ],
    cues: ["Corpo numa linha só, visto de frente"],
    mistakes: ["Rotacionar o tronco"],
  },
  "Russian Twist": {
    externalId: "Russian_Twist",
    cadence: "2-0-1-0",
    execution: [
      "Sente com joelhos flexionados e tronco inclinado para trás.",
      "Gire o tronco de um lado ao outro controladamente.",
    ],
    cues: ["A rotação vem do tronco, não só dos braços"],
    mistakes: ["Fazer rápido demais perdendo o controle"],
  },
  "Elevação de Pernas": {
    externalId: "Hanging_Leg_Raise",
    cadence: "3-1-1-0",
    execution: [
      "Pendure-se na barra com os braços estendidos.",
      "Eleve as pernas até a linha do quadril ou acima.",
      "Desça controlado sem balançar.",
    ],
    cues: ["Enrole a pelve no topo — não é só levantar a perna"],
    mistakes: ["Usar balanço do corpo"],
  },
  "Ab Wheel": {
    externalId: "Barbell_Ab_Rollout_-_On_Knees",
    cadence: "3-0-1-0",
    execution: [
      "Ajoelhado, segure a roda à frente do corpo.",
      "Role para frente mantendo o abdômen contraído e a lombar neutra.",
      "Vá só até onde conseguir manter o quadril alinhado.",
      "Volte puxando com o abdômen.",
    ],
    cues: ["Costelas fechadas o tempo todo"],
    mistakes: ["Deixar a lombar arquear na extensão"],
  },
  "Rosca de Punho": {
    externalId: "Palms-Up_Barbell_Wrist_Curl_Over_A_Bench",
    cadence: "2-1-1-1",
    execution: [
      "Apoie os antebraços num banco com os punhos para fora da borda.",
      "Deixe o punho estender e depois flexione levantando o peso.",
    ],
    cues: ["Só o punho se move"],
    mistakes: ["Mover o antebraço"],
  },
};
