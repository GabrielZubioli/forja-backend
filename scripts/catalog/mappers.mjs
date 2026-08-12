/**
 * Mapeamento do vocabulário da base de origem para os enums do banco.
 *
 * Cada função aqui é uma decisão de modelagem, não uma conversão mecânica —
 * por isso vivem separadas do gerador de SQL e do tradutor.
 */

/** Músculo da base de origem → `muscle_t`. */
export const MUSCLE_MAP = {
  abdominals: "abs",
  abductors: "abductors",
  adductors: "adductors",
  biceps: "biceps",
  calves: "calves",
  chest: "chest",
  forearms: "forearms",
  glutes: "glutes",
  hamstrings: "hamstrings",
  lats: "lats",
  "lower back": "lower_back",
  "middle back": "back",
  neck: "neck",
  quadriceps: "quads",
  shoulders: "shoulders",
  traps: "traps",
  triceps: "triceps",
};

/**
 * Equipamento da base de origem → `equipment_t`.
 *
 * Bola medicinal, bola suíça e rolo de liberação caem em 'other' em vez de
 * ganharem valores próprios no enum: são acessórios de baixa frequência, e
 * inchar o enum obrigaria a tratar cada um na UI (rótulo, ícone, filtro) sem
 * ganho proporcional. O nome do exercício já diz qual é.
 */
export const EQUIPMENT_MAP = {
  barbell: "barbell",
  dumbbell: "dumbbell",
  cable: "cable",
  machine: "machine",
  "body only": "bodyweight",
  kettlebells: "kettlebell",
  bands: "band",
  "e-z curl bar": "barbell",
  "medicine ball": "other",
  "exercise ball": "other",
  "foam roll": "other",
  other: "other",
};

/**
 * Categoria da base → `exercise_category_t`.
 *
 * 'strongman' e 'powerlifting' viram 'strength': ambos são treino de força com
 * implementos diferentes, e o app não tem — nem precisa ter — telas distintas
 * para eles.
 */
export const CATEGORY_MAP = {
  strength: "strength",
  stretching: "stretching",
  plyometrics: "plyometrics",
  strongman: "strength",
  powerlifting: "strength",
  cardio: "cardio",
  "olympic weightlifting": "olympic",
};

/** Nível da base → `exercise_level_t`. */
export const LEVEL_MAP = {
  beginner: "beginner",
  intermediate: "intermediate",
  expert: "advanced",
};

/**
 * Padrão de movimento, deduzido do nome + músculo + mecânica.
 *
 * Isso substitui a heurística por palavra-chave que hoje vive em
 * `src/data/routines.ts` e roda **a cada geração de plano**. Resolver na
 * importação significa resolver uma vez, com mais informação disponível, e
 * deixar o gerador apenas consultar uma coluna indexada.
 *
 * A ordem dos testes é a precedência: um "Incline Bench Press" é empurrão
 * horizontal mesmo tendo "incline" no nome.
 */
export function inferMovementPattern(exercise) {
  const n = exercise.name.toLowerCase();
  const cat = exercise.category;
  const primary = exercise.primaryMuscles[0] ?? "";

  if (cat === "cardio") return "cardio";
  if (cat === "stretching") return "mobility";

  const has = (...terms) => terms.some((t) => n.includes(t));

  if (has("farmer", "carry", "suitcase", "waiter walk")) return "carry";

  // Empurrar vertical antes do horizontal: "overhead press" e "military press"
  // contêm "press", e o teste horizontal casaria primeiro.
  if (
    has(
      "overhead press",
      "military press",
      "shoulder press",
      "push press",
      "handstand",
      "jerk",
      "arnold",
    )
  )
    return "vertical_push";
  if (
    has(
      "bench press",
      "chest press",
      "push-up",
      "push up",
      "pushup",
      "dip",
      "floor press",
      "fly",
      "crossover",
      "pec deck",
      "butterfly",
    )
  )
    return "horizontal_push";

  if (has("pulldown", "pull-up", "pull up", "pullup", "chin-up", "chin up", "chinup", "pullover"))
    return "vertical_pull";
  if (has("row", "face pull", "rear delt", "reverse fly", "shrug")) return "horizontal_pull";

  if (
    has(
      "deadlift",
      "good morning",
      "hip thrust",
      "glute bridge",
      "back extension",
      "hyperextension",
      "swing",
      "clean",
      "snatch",
      "romanian",
      "stiff",
    )
  )
    return "hinge";
  if (has("squat", "leg press", "hack")) return "squat";
  if (has("lunge", "split squat", "step-up", "step up", "bulgarian")) return "lunge";

  if (
    ["abdominals"].includes(primary) ||
    has(
      "plank",
      "crunch",
      "sit-up",
      "situp",
      "twist",
      "rollout",
      "leg raise",
      "knee raise",
      "woodchop",
    )
  )
    return "core";

  return exercise.mechanic === "compound" ? "horizontal_push" : "isolation";
}

/**
 * Lesões que desaconselham o exercício.
 *
 * Conservador de propósito: marcar demais faz o gerador excluir metade do
 * catálogo e entregar um plano pobre a quem declarou uma dor antiga no joelho;
 * marcar de menos prescreve agachamento a quem não pode agachar. A régua usada
 * é "movimento que carrega diretamente a articulação sob amplitude ou carga
 * significativa", não "movimento que a envolve" — quase tudo envolve tudo.
 */
export function inferContraindications(exercise, pattern) {
  const n = exercise.name.toLowerCase();
  const out = new Set();
  const has = (...terms) => terms.some((t) => n.includes(t));

  // Coluna lombar sob carga axial ou em flexão carregada.
  if (pattern === "hinge" || has("good morning", "deadlift", "bent over", "bent-over"))
    out.add("lower_back");
  if (pattern === "squat" && !has("leg press", "hack", "extension")) out.add("lower_back");
  if (has("sit-up", "situp", "russian twist", "rollout", "hyperextension")) out.add("lower_back");

  // Joelho: flexão profunda sob carga, extensão isolada e impacto.
  if (pattern === "squat" || pattern === "lunge") out.add("knee");
  if (has("leg extension", "jump", "plyo", "box", "sprint", "burpee")) out.add("knee");

  // Ombro: elevação acima da cabeça, mergulho e movimentos por trás da nuca.
  if (pattern === "vertical_push") out.add("shoulder");
  if (has("dip", "behind the neck", "upright row", "lateral raise", "snatch", "jerk"))
    out.add("shoulder");

  // Cotovelo: extensão de tríceps carregada e mergulho.
  if (
    has(
      "skullcrusher",
      "triceps extension",
      "tricep extension",
      "lying triceps",
      "dip",
      "close-grip",
    )
  )
    out.add("elbow");

  // Punho: apoio em extensão máxima ou pegada frontal.
  if (has("front squat", "wrist", "handstand", "clean", "push-up", "pushup", "plank"))
    out.add("wrist");

  // Quadril: amplitude profunda e abdução/adução carregada.
  if (has("deep squat", "sumo", "adductor", "abductor", "hip thrust", "lunge")) out.add("hip");

  if (has("neck", "behind the neck", "shrug")) out.add("neck");
  if (has("calf", "jump", "sprint", "hop")) out.add("ankle");

  return [...out];
}

/**
 * Contribuição de cada músculo para o estímulo total do exercício.
 *
 * O primário recebe 1; os secundários, 0,5 em compostos e 0,35 em isolados.
 *
 * O número não é arbitrário: hoje o modelo de recuperação trata todo secundário
 * como "meia série" fixa. Manter 0,5 para compostos preserva esse
 * comportamento, e baixar para 0,35 nos isolados corrige o caso em que ele
 * exagerava — o auxílio do antebraço numa rosca não é metade do estímulo do
 * bíceps.
 */
export function muscleContributions(exercise) {
  const rows = [];
  const seen = new Set();
  const secondaryWeight = exercise.mechanic === "compound" ? 0.5 : 0.35;

  for (const m of exercise.primaryMuscles) {
    const mapped = MUSCLE_MAP[m];
    if (mapped && !seen.has(mapped)) {
      seen.add(mapped);
      rows.push({ muscle: mapped, contribution: 1 });
    }
  }
  for (const m of exercise.secondaryMuscles ?? []) {
    const mapped = MUSCLE_MAP[m];
    if (mapped && !seen.has(mapped)) {
      seen.add(mapped);
      rows.push({ muscle: mapped, contribution: secondaryWeight });
    }
  }
  return rows;
}

/**
 * Popularidade relativa (0–100).
 *
 * Entre 873 exercícios, o gerador precisa de um critério para escolher entre
 * dois igualmente adequados — e prescrever o obscuro quando existe o consagrado
 * é uma forma silenciosa de piorar o plano. Sem um dado real de uso, a
 * aproximação usa o que correlaciona bem: equipamento comum, movimento composto
 * e ausência de marcadores de nicho.
 */
export function inferPopularity(exercise, pattern) {
  const n = exercise.name.toLowerCase();
  let score = 50;

  if (["barbell", "dumbbell", "cable", "machine", "body only"].includes(exercise.equipment))
    score += 15;
  if (exercise.mechanic === "compound") score += 10;
  if (exercise.level === "beginner") score += 8;
  if (exercise.level === "expert") score -= 10;

  // Marcadores de nicho: liberação miofascial, variações acrobáticas e
  // implementos de strongman raramente aparecem numa academia comum.
  if (/smr|foam roll|iliotibial|prone|windmill|turkish|landmine|sled|tire|atlas|kegel/.test(n))
    score -= 30;
  if (exercise.category === "stretching") score -= 15;
  if (exercise.category === "strongman" || exercise.category === "olympic weightlifting")
    score -= 15;
  if (pattern === "mobility") score -= 10;

  return Math.max(0, Math.min(100, score));
}

/** Base pública das imagens. CDN, não `raw.githubusercontent` (que não é feito para servir tráfego). */
const IMAGE_CDN = "https://cdn.jsdelivr.net/gh/yuhonas/free-exercise-db@main/exercises";

export function imageUrls(exercise) {
  return (exercise.images ?? []).map((p) => `${IMAGE_CDN}/${p}`);
}
