/**
 * Tradução dos nomes de exercícios — inglês → português.
 *
 * ## Por que não é palavra por palavra
 *
 * As duas línguas ordenam o nome de forma diferente. Em inglês o equipamento
 * vem na frente ("Barbell Bench Press"); em português ele vem no fim, com
 * preposição ("Supino Reto com Barra"). Traduzir palavra a palavra produziria
 * "Barra Supino", que é o tipo de coisa que faz o app parecer amador.
 *
 * O algoritmo tem três passos:
 *
 * 1. **Extrai o equipamento** do começo (ou do meio) e o guarda de lado.
 * 2. **Traduz o resto por sintagmas**, do mais longo para o mais curto —
 *    "lat pulldown" precisa casar antes de "lat" e de "pulldown", senão vira
 *    "dorsal puxada para baixo".
 * 3. **Recoloca o equipamento** no fim, com a preposição certa ("com Barra",
 *    "na Polia", "na Máquina").
 *
 * O nome original fica gravado em `name_en`: quem treina há anos procura por
 * "romanian deadlift", e a busca precisa achar.
 */

/**
 * Equipamento → sufixo em português. `null` = não vira sufixo (fica implícito).
 *
 * A **ordem do objeto é a prioridade de casamento**, não o comprimento: "Smith
 * Machine" contém "machine", e casar o genérico primeiro produziria "Smith
 * Panturrilha na Máquina" em vez de "Panturrilha no Smith".
 */
const EQUIPMENT_SUFFIX = {
  "smith machine": "no Smith",
  smith: "no Smith",
  "e-z curl bar": "com Barra W",
  "ez-bar": "com Barra W",
  "ez bar": "com Barra W",
  "e-z bar": "com Barra W",
  "medicine ball": "com Bola Medicinal",
  "exercise ball": "com Bola Suíça",
  "stability ball": "com Bola Suíça",
  "body only": null,
  barbell: "com Barra",
  dumbbell: "com Halteres",
  cable: "na Polia",
  machine: "na Máquina",
  lever: "na Máquina",
  leverage: "na Máquina",
  kettlebell: "com Kettlebell",
  smith: "no Smith",
  band: "com Elástico",
  bands: "com Elástico",
  "medicine ball": "com Bola Medicinal",
  "exercise ball": "com Bola Suíça",
  "stability ball": "com Bola Suíça",
  "ez-bar": "com Barra W",
  "ez bar": "com Barra W",
  "e-z bar": "com Barra W",
  "e-z curl bar": "com Barra W",
  sled: "no Trenó",
  chains: "com Correntes",
  "body only": null,
  bodyweight: null,
};

/**
 * Sintagmas, do mais longo para o mais curto.
 *
 * A ordem importa: o algoritmo casa gulosamente, então uma entrada curta
 * colocada antes de uma longa que a contém impede a longa de casar.
 */
const PHRASES = [
  // --- peito
  ["decline bench press", "Supino Declinado"],
  ["incline bench press", "Supino Inclinado"],
  ["bench press", "Supino"],
  ["chest press", "Supino na Máquina"],
  ["chest fly", "Crucifixo"],
  ["chest flyes", "Crucifixo"],
  ["incline flyes", "Crucifixo Inclinado"],
  ["decline flyes", "Crucifixo Declinado"],
  ["flyes", "Crucifixo"],
  ["flye", "Crucifixo"],
  ["fly", "Crucifixo"],
  ["cable crossover", "Crossover"],
  ["crossover", "Crossover"],
  ["butterfly", "Peck Deck"],
  ["pec deck", "Peck Deck"],
  ["push-ups", "Flexão de Braço"],
  ["push ups", "Flexão de Braço"],
  ["pushups", "Flexão de Braço"],
  ["push-up", "Flexão de Braço"],
  ["push up", "Flexão de Braço"],
  ["pushup", "Flexão de Braço"],
  ["press-up", "Flexão de Braço"],
  ["step-ups", "Subida no Banco"],
  ["step ups", "Subida no Banco"],
  ["butt ups", "Elevação de Quadril"],

  // --- costas
  ["wide-grip lat pulldown", "Puxada Aberta"],
  ["close-grip lat pulldown", "Puxada Fechada"],
  ["reverse grip pulldown", "Puxada Supinada"],
  ["lat pulldown", "Puxada na Frente"],
  ["pulldown", "Puxada"],
  ["pull-ups", "Barra Fixa"],
  ["pull ups", "Barra Fixa"],
  ["pullups", "Barra Fixa"],
  ["pull-up", "Barra Fixa"],
  ["pull up", "Barra Fixa"],
  ["pullup", "Barra Fixa"],
  ["chin-ups", "Barra Fixa Supinada"],
  ["chin ups", "Barra Fixa Supinada"],
  ["chinups", "Barra Fixa Supinada"],
  ["chin-up", "Barra Fixa Supinada"],
  ["chin up", "Barra Fixa Supinada"],
  ["pullover", "Pullover"],
  ["bent over row", "Remada Curvada"],
  ["bent-over row", "Remada Curvada"],
  ["upright row", "Remada Alta"],
  ["t-bar row", "Remada Cavalinho"],
  ["inverted row", "Remada Invertida"],
  ["seated cable row", "Remada Baixa"],
  ["cable row", "Remada na Polia"],
  ["row", "Remada"],
  ["rows", "Remadas"],
  ["shrug", "Encolhimento"],
  ["shrugs", "Encolhimentos"],
  ["face pull", "Face Pull"],
  ["hyperextension", "Extensão Lombar"],
  ["back extension", "Extensão Lombar"],
  ["good morning", "Bom Dia"],
  ["superman", "Superman"],

  // --- pernas
  ["front squat", "Agachamento Frontal"],
  ["hack squat", "Agachamento Hack"],
  ["sumo squat", "Agachamento Sumô"],
  ["split squat", "Agachamento Búlgaro"],
  ["overhead squat", "Agachamento Overhead"],
  ["goblet squat", "Agachamento Goblet"],
  ["jump squat", "Agachamento com Salto"],
  ["squat", "Agachamento"],
  ["squats", "Agachamentos"],
  ["leg press", "Leg Press"],
  ["leg extension", "Cadeira Extensora"],
  ["leg extensions", "Cadeira Extensora"],
  ["seated leg curl", "Cadeira Flexora"],
  ["lying leg curl", "Mesa Flexora"],
  ["lying leg curls", "Mesa Flexora"],
  ["leg curl", "Flexora"],
  ["leg curls", "Flexora"],
  ["romanian deadlift", "Terra Romeno"],
  ["stiff-legged deadlift", "Stiff"],
  ["stiff legged deadlift", "Stiff"],
  ["sumo deadlift", "Terra Sumô"],
  ["rack pull", "Rack Pull"],
  ["deadlift", "Levantamento Terra"],
  ["hip thrust", "Hip Thrust"],
  ["glute bridge", "Elevação Pélvica"],
  ["butt lift", "Elevação Pélvica"],
  ["bridge", "Ponte"],
  ["lunge", "Avanço"],
  ["lunges", "Avanços"],
  ["step-up", "Subida no Banco"],
  ["step up", "Subida no Banco"],
  ["calf raise", "Panturrilha"],
  ["calf raises", "Panturrilha"],
  ["calf press", "Panturrilha no Leg Press"],
  ["donkey calf", "Panturrilha Burro"],
  ["adductor", "Adutor"],
  ["abductor", "Abdutor"],
  ["thigh abductor", "Cadeira Abdutora"],
  ["thigh adductor", "Cadeira Adutora"],

  // --- ombros
  ["shoulder press", "Desenvolvimento"],
  ["military press", "Desenvolvimento Militar"],
  ["overhead press", "Desenvolvimento"],
  ["arnold press", "Desenvolvimento Arnold"],
  ["push press", "Push Press"],
  ["lateral raise", "Elevação Lateral"],
  ["side lateral raise", "Elevação Lateral"],
  ["front raise", "Elevação Frontal"],
  ["rear delt raise", "Crucifixo Invertido"],
  ["reverse flyes", "Crucifixo Invertido"],
  ["reverse fly", "Crucifixo Invertido"],
  ["external rotation", "Rotação Externa"],
  ["internal rotation", "Rotação Interna"],

  // --- braços
  ["preacher curl", "Rosca Scott"],
  ["preacher curls", "Rosca Scott"],
  ["hammer curl", "Rosca Martelo"],
  ["hammer curls", "Rosca Martelo"],
  ["concentration curl", "Rosca Concentrada"],
  ["concentration curls", "Rosca Concentrada"],
  ["spider curl", "Rosca Spider"],
  ["drag curl", "Rosca Drag"],
  ["reverse curl", "Rosca Inversa"],
  ["wrist curl", "Rosca de Punho"],
  ["bicep curl", "Rosca Direta"],
  ["biceps curl", "Rosca Direta"],
  ["curl", "Rosca"],
  ["curls", "Rosca"],
  ["skullcrusher", "Tríceps Testa"],
  ["lying triceps press", "Tríceps Testa"],
  ["lying triceps extension", "Tríceps Testa"],
  ["triceps pushdown", "Tríceps na Polia"],
  ["tricep pushdown", "Tríceps na Polia"],
  ["pushdown", "Tríceps na Polia"],
  ["triceps extension", "Tríceps Extensão"],
  ["tricep extension", "Tríceps Extensão"],
  ["triceps kickback", "Tríceps Coice"],
  ["tricep kickback", "Tríceps Coice"],
  ["kickback", "Coice"],
  ["bench dip", "Mergulho entre Bancos"],
  ["bench dips", "Mergulho entre Bancos"],
  ["dip", "Mergulho no Paralelo"],
  ["dips", "Mergulho no Paralelo"],

  // --- core
  ["hanging leg raise", "Elevação de Pernas Suspenso"],
  ["leg raise", "Elevação de Pernas"],
  ["knee raise", "Elevação de Joelhos"],
  ["sit-ups", "Abdominal Completo"],
  ["sit ups", "Abdominal Completo"],
  ["situps", "Abdominal Completo"],
  ["sit-up", "Abdominal Completo"],
  ["sit up", "Abdominal Completo"],
  ["situp", "Abdominal Completo"],
  ["crunch", "Abdominal"],
  ["crunches", "Abdominal"],
  ["plank", "Prancha"],
  ["side bridge", "Prancha Lateral"],
  ["russian twist", "Russian Twist"],
  ["ab rollout", "Ab Wheel"],
  ["rollout", "Rollout"],
  ["woodchop", "Lenhador"],
  ["mountain climber", "Escalador"],
  ["flutter kick", "Tesoura"],
  ["scissor kick", "Tesoura"],
  ["oblique", "Oblíquo"],

  // --- olímpicos / potência
  ["power clean", "Clean de Potência"],
  ["hang clean", "Clean Suspenso"],
  ["clean and jerk", "Arremesso"],
  ["clean", "Clean"],
  ["snatch", "Arranco"],
  ["jerk", "Jerk"],
  ["thruster", "Thruster"],
  ["kettlebell swing", "Swing"],
  ["swing", "Swing"],
  ["box jump", "Salto na Caixa"],
  ["broad jump", "Salto Horizontal"],
  ["burpee", "Burpee"],
  ["farmer's walk", "Caminhada do Fazendeiro"],
  ["farmers walk", "Caminhada do Fazendeiro"],

  // --- cardio
  ["treadmill", "Esteira"],
  ["elliptical", "Elíptico"],
  ["stationary bike", "Bicicleta Ergométrica"],
  ["rowing machine", "Remo Ergômetro"],
  ["jump rope", "Pular Corda"],
  ["jumping rope", "Pular Corda"],
  ["stair climber", "Escada"],
  ["running", "Corrida"],
  ["sprint", "Tiro"],
  ["walking", "Caminhada"],

  // --- alongamento / mobilidade
  ["foam roll", "Liberação com Rolo"],
  ["smr", "Liberação Miofascial"],
  ["stretch", "Alongamento"],
  ["mobility", "Mobilidade"],
  ["dynamic", "Dinâmico"],

  // --- modificadores (aplicados ao que sobrar)
  ["close-grip", "Pegada Fechada"],
  ["close grip", "Pegada Fechada"],
  ["wide-grip", "Pegada Aberta"],
  ["wide grip", "Pegada Aberta"],
  ["neutral grip", "Pegada Neutra"],
  ["reverse grip", "Pegada Supinada"],
  ["reverse-grip", "Pegada Supinada"],
  ["underhand", "Pegada Supinada"],
  ["overhand", "Pegada Pronada"],
  ["palms-down", "Palmas para Baixo"],
  ["palms-up", "Palmas para Cima"],
  ["palms up", "Palmas para Cima"],
  ["palms down", "Palmas para Baixo"],
  ["behind the neck", "por Trás da Nuca"],
  ["behind the back", "por Trás do Corpo"],
  ["one arm", "Unilateral"],
  ["one-arm", "Unilateral"],
  ["single arm", "Unilateral"],
  ["single-arm", "Unilateral"],
  ["single leg", "Unilateral"],
  ["single-leg", "Unilateral"],
  ["one leg", "Unilateral"],
  ["one-leg", "Unilateral"],
  ["alternating", "Alternado"],
  ["alternate", "Alternado"],
  ["standing", "em Pé"],
  ["seated", "Sentado"],
  ["lying", "Deitado"],
  ["kneeling", "Ajoelhado"],
  ["prone", "de Bruços"],
  ["supine", "em Decúbito Dorsal"],
  ["incline", "Inclinado"],
  ["decline", "Declinado"],
  ["flat", "Reto"],
  ["bent over", "Curvado"],
  ["bent-over", "Curvado"],
  ["wide stance", "Base Aberta"],
  ["narrow stance", "Base Fechada"],
  ["weighted", "com Peso"],
  ["assisted", "Assistido"],
  ["suspended", "Suspenso"],
  ["isometric", "Isométrico"],
  ["explosive", "Explosivo"],
  ["partial", "Parcial"],
  ["deficit", "com Déficit"],
  ["paused", "com Pausa"],
  ["negative", "Negativa"],
  ["rope attachment", "com Corda"],
  ["rope", "Corda"],
  ["v-bar", "Barra V"],
  ["straight bar", "Barra Reta"],
  ["straight-arm", "Braço Estendido"],
  ["straight arm", "Braço Estendido"],
  ["bent-arm", "Braço Flexionado"],
  ["bent arm", "Braço Flexionado"],
  ["floor", "no Chão"],
  ["bench", "no Banco"],
  ["wall", "na Parede"],
  ["chair", "na Cadeira"],
  ["box", "na Caixa"],
  ["side", "Lateral"],
  ["front", "Frontal"],
  ["rear", "Posterior"],
  ["reverse", "Inverso"],
  ["overhead", "acima da Cabeça"],
  ["medium grip", "Pegada Média"],
  ["shoulder width", "Largura dos Ombros"],
  ["upper", "Superior"],
  ["lower", "Inferior"],
  ["inner", "Interno"],
  ["outer", "Externo"],

  // --- partes do corpo soltas
  ["hamstring", "Posterior de Coxa"],
  ["hamstrings", "Posteriores de Coxa"],
  ["quadriceps", "Quadríceps"],
  ["quad", "Quadríceps"],
  ["glute", "Glúteo"],
  ["glutes", "Glúteos"],
  ["calf", "Panturrilha"],
  ["calves", "Panturrilhas"],
  ["chest", "Peito"],
  ["back", "Costas"],
  ["lat", "Dorsal"],
  ["lats", "Dorsais"],
  ["trap", "Trapézio"],
  ["traps", "Trapézio"],
  ["shoulder", "Ombro"],
  ["shoulders", "Ombros"],
  ["delt", "Deltoide"],
  ["deltoid", "Deltoide"],
  ["bicep", "Bíceps"],
  ["biceps", "Bíceps"],
  ["tricep", "Tríceps"],
  ["triceps", "Tríceps"],
  ["forearm", "Antebraço"],
  ["forearms", "Antebraço"],
  ["abs", "Abdômen"],
  ["abdominal", "Abdominal"],
  ["abdominals", "Abdômen"],
  ["core", "Core"],
  ["hip", "Quadril"],
  ["hips", "Quadril"],
  ["knee", "Joelho"],
  ["ankle", "Tornozelo"],
  ["wrist", "Punho"],
  ["neck", "Pescoço"],
  ["groin", "Virilha"],
  ["leg", "Perna"],
  ["legs", "Pernas"],
  ["arm", "Braço"],
  ["arms", "Braços"],
  ["thigh", "Coxa"],
  ["elbow", "Cotovelo"],

  // --- verbos e conectivos residuais
  ["press", "Pressão"],
  ["raise", "Elevação"],
  ["raises", "Elevações"],
  ["extension", "Extensão"],
  ["extensions", "Extensão"],
  ["pull", "Puxada"],
  ["push", "Empurrar"],
  ["twist", "Rotação"],
  ["rotation", "Rotação"],
  ["jump", "Salto"],
  ["jumps", "Saltos"],
  ["hop", "Salto"],
  ["hops", "Saltos"],
  ["throw", "Arremesso"],
  ["walk", "Caminhada"],
  ["drill", "Exercício"],
  ["circles", "Círculos"],
  ["with", "com"],
  ["without", "sem"],
  ["and", "e"],
  ["to", "para"],
  ["on", "no"],
  ["in", "em"],
  ["the", ""],
  ["a", ""],
  ["of", "de"],
  ["from", "de"],
  ["against", "contra"],
  ["over", "sobre"],
  ["under", "sob"],
  ["behind", "atrás"],
  ["版", ""],
];

/**
 * Termos que qualificam o movimento em vez de nomeá-lo.
 *
 * É a distinção que o inglês resolve pela ordem ("Incline Bench Press") e o
 * português, pela posposição ("Supino Inclinado"). Sem separar os dois papéis,
 * a tradução sai com o adjetivo na frente — "Inclinado Supino" — que é o erro
 * mais visível de um catálogo mal traduzido.
 */
const MODIFIER_KEYS = new Set([
  "close-grip",
  "close grip",
  "wide-grip",
  "wide grip",
  "neutral grip",
  "reverse grip",
  "reverse-grip",
  "underhand",
  "overhand",
  "palms-down",
  "palms-up",
  "palms up",
  "palms down",
  "behind the neck",
  "behind the back",
  "one arm",
  "one-arm",
  "single arm",
  "single-arm",
  "single leg",
  "single-leg",
  "one leg",
  "one-leg",
  "alternating",
  "alternate",
  "standing",
  "seated",
  "lying",
  "kneeling",
  "prone",
  "supine",
  "incline",
  "decline",
  "flat",
  "bent over",
  "bent-over",
  "wide stance",
  "narrow stance",
  "weighted",
  "assisted",
  "suspended",
  "isometric",
  "explosive",
  "partial",
  "deficit",
  "paused",
  "negative",
  "rope attachment",
  "rope",
  "v-bar",
  "straight bar",
  "straight-arm",
  "bent-arm",
  "floor",
  "bench",
  "wall",
  "chair",
  "box",
  "side",
  "front",
  "rear",
  "reverse",
  "overhead",
  "medium grip",
  "shoulder width",
  "upper",
  "lower",
  "inner",
  "outer",
  "with",
  "without",
  "and",
  "to",
  "on",
  "in",
  "the",
  "a",
  "of",
  "from",
  "against",
  "over",
  "under",
  "behind",
  "dynamic",
]);

// Casa sintagmas maiores primeiro. Sem isso, "leg" casaria dentro de
// "leg press" e o resultado seria "Perna Pressão".
const ORDERED_PHRASES = [...PHRASES].sort((a, b) => b[0].length - a[0].length);

const escapeRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/** Extrai o equipamento do nome e devolve o resto. */
function extractEquipment(lower) {
  // Sem ordenar: a ordem de declaração é a prioridade (ver comentário do mapa).
  for (const key of Object.keys(EQUIPMENT_SUFFIX)) {
    const re = new RegExp(`(^|[\\s\\-/])${escapeRe(key)}($|[\\s\\-/])`, "i");
    if (re.test(lower)) {
      return { rest: lower.replace(re, " ").trim(), suffix: EQUIPMENT_SUFFIX[key] };
    }
  }
  return { rest: lower, suffix: undefined };
}

/**
 * Quebra o texto em fragmentos traduzidos, cada um marcado como núcleo ou
 * modificador. Trechos sem correspondência viram núcleo com a grafia original
 * — nomes próprios ("Zercher", "Arnold", "Landmine") devem sobreviver.
 */
function tokenize(text, out = []) {
  const trimmed = text.trim();
  if (!trimmed) return out;

  for (const [en, pt] of ORDERED_PHRASES) {
    const re = new RegExp(`(^|[\\s\\-,/])${escapeRe(en)}($|[\\s\\-,/])`, "i");
    const m = trimmed.match(re);
    if (m && m.index !== undefined) {
      // O que vem antes é traduzido também, recursivamente — senão um
      // modificador anterior ao núcleo ("Decline EZ Bar Triceps Extension")
      // escaparia sem tradução.
      tokenize(trimmed.slice(0, m.index), out);
      if (pt) out.push({ text: pt, modifier: MODIFIER_KEYS.has(en) });
      tokenize(trimmed.slice(m.index + m[0].length - (m[2] ? 1 : 0)), out);
      return out;
    }
  }

  out.push({ text: titleCase(trimmed), modifier: false });
  return out;
}

function titleCase(s) {
  return s
    .split(/\s+/)
    .map((w) => (w.length <= 2 ? w : w[0].toUpperCase() + w.slice(1)))
    .join(" ");
}

/**
 * "Press" sozinho não tem tradução única: no peito é supino, no ombro é
 * desenvolvimento, no tríceps é uma extensão. Sem o músculo-alvo, a única saída
 * honesta seria deixar em inglês.
 */
const BARE_PRESS_BY_MUSCLE = {
  chest: "Supino",
  shoulders: "Desenvolvimento",
  triceps: "Tríceps",
  quadriceps: "Leg Press",
  hamstrings: "Leg Press",
  glutes: "Leg Press",
  calves: "Panturrilha",
};

/**
 * Traduz o nome completo de um exercício.
 *
 * `primaryMuscle` (opcional, no vocabulário da base de origem) desambigua
 * termos que dependem do alvo. Devolve o original quando a tradução sai vazia —
 * um nome em inglês é melhor que um nome errado.
 */
export function translateExerciseName(nameEn, primaryMuscle) {
  const cleaned = nameEn
    .replace(/\s*[-–]\s*/g, " ")
    // Barras entre letras separam alternativas ("Adductor/Groin") e merecem
    // espaço; entre dígitos são fração ("3/4") e devem ficar coladas.
    .replace(/(?<=[a-zA-Z])\/(?=[a-zA-Z])/g, " / ")
    .replace(/\s+/g, " ")
    .trim();

  const { rest, suffix } = extractEquipment(cleaned.toLowerCase());
  const tokens = tokenize(rest);

  const heads = tokens.filter((t) => !t.modifier).map((t) => t.text);
  const mods = tokens.filter((t) => t.modifier).map((t) => t.text);

  // Preposições soltas ("com", "e", "de") só fazem sentido ligando algo. Quando
  // o termo que elas ligavam virou sufixo de equipamento, elas ficam órfãs.
  const ORPHANS = new Set([
    "com",
    "e",
    "de",
    "para",
    "no",
    "em",
    "sem",
    "sobre",
    "sob",
    "atrás",
    "contra",
  ]);

  const resolved = [...heads, ...mods.filter((m) => !ORPHANS.has(m))].map((t) =>
    t === "Pressão" ? (BARE_PRESS_BY_MUSCLE[primaryMuscle ?? ""] ?? "Press") : t,
  );

  // Dedupe preservando a ordem: nomes como "Calf Press On The Leg Press
  // Machine" casam dois sintagmas que traduzem para o mesmo termo.
  const seen = new Set();
  const core = resolved
    .filter((t) => t && !seen.has(t.toLowerCase()) && seen.add(t.toLowerCase()))
    .join(" ");

  if (!core.trim()) return cleaned;

  return [core, suffix].filter(Boolean).join(" ").replace(/\s+/g, " ").trim();
}
