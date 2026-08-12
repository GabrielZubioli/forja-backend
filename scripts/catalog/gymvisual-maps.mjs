/**
 * Vocabulários do `hasaneyldrm/exercises-dataset` → enums do banco.
 *
 * O dataset usa três eixos que não batem com os nossos:
 *
 * - `target` (19 valores) é o músculo principal, com nomes de anatomia popular
 *   ("pectorals", "delts", "cardiovascular system").
 * - `equipment` (28 valores) desce a detalhes que o app não distingue
 *   ("leverage machine", "sled machine", "smith machine" são todos máquina).
 * - `category`/`body_part` (10 valores) é **região do corpo**, não o tipo de
 *   exercício. O nosso `category` é força/cardio/alongamento — outro eixo
 *   inteiro. Traduzir um pelo outro produziria "Supino Reto: categoria peito",
 *   que não é uma categoria.
 *
 * Cada mapa aqui é explícito em relação aos valores que a fonte realmente
 * contém: nada de heurística por substring. Um valor novo cai em `undefined` e
 * é **contado e reportado** pelo script, em vez de virar silenciosamente
 * "outro".
 */

/** `target`, `muscle_group` e `secondary_muscles` → `muscle_t`. */
export const GV_MUSCLE_MAP = {
  abs: "abs",
  quads: "quads",
  lats: "lats",
  calves: "calves",
  pectorals: "chest",
  glutes: "glutes",
  hamstrings: "hamstrings",
  adductors: "adductors",
  triceps: "triceps",
  "cardiovascular system": "cardio",
  spine: "lower_back",
  "upper back": "back",
  biceps: "biceps",
  delts: "shoulders",
  forearms: "forearms",
  traps: "traps",
  "serratus anterior": "core",
  abductors: "abductors",
  "levator scapulae": "neck",

  // Valores que só aparecem em `muscle_group` / `secondary_muscles`.
  "hip flexors": "core",
  "lower back": "lower_back",
  rhomboids: "back",
  obliques: "obliques",
  "latissimus dorsi": "lats",
  core: "core",
  shoulders: "shoulders",
  chest: "chest",
  back: "back",
  neck: "neck",
  "full body": "full_body",
  deltoids: "shoulders",
  quadriceps: "quads",
  gluteus: "glutes",
  "gluteus maximus": "glutes",
  "erector spinae": "lower_back",
  "rotator cuff": "shoulders",
  wrists: "forearms",
  ankles: "calves",
  hips: "glutes",
  groin: "adductors",
  soleus: "calves",
  brachialis: "biceps",
  brachioradialis: "forearms",
  "transverse abdominis": "core",
  pectorals_minor: "chest",
  sternocleidomastoid: "neck",
  "hip abductors": "abductors",
  "hip adductors": "adductors",

  // Acrescentados depois que a primeira execução do script os reportou como
  // não mapeados. É o ciclo previsto: a fonte traz um termo novo, o script
  // avisa em vez de classificar errado, e o termo vira uma linha aqui.
  abdominals: "abs",
  "lower abs": "abs",
  trapezius: "traps",
  "rear deltoids": "rear_delts",
  "upper chest": "chest",
  "inner thighs": "adductors",
  // Punho, mão e pegada não têm músculo próprio no enum; o antebraço é o que
  // efetivamente trabalha e é onde o usuário procuraria.
  "wrist flexors": "forearms",
  "wrist extensors": "forearms",
  "grip muscles": "forearms",
  hands: "forearms",
  // Idem para tornozelo, pé e canela: a panturrilha é o grupo da região.
  "ankle stabilizers": "calves",
  feet: "calves",
  shins: "calves",
};

/** `equipment` → `equipment_t`. */
export const GV_EQUIPMENT_MAP = {
  "body weight": "bodyweight",
  assisted: "bodyweight",
  weighted: "bodyweight",

  barbell: "barbell",
  "ez barbell": "barbell",
  "olympic barbell": "barbell",
  "trap bar": "barbell",

  dumbbell: "dumbbell",
  kettlebell: "kettlebell",

  cable: "cable",
  rope: "cable",

  "leverage machine": "machine",
  "smith machine": "machine",
  "sled machine": "machine",
  hammer: "machine",

  band: "band",
  "resistance band": "band",

  // Aparelhos de cardio: o app não os distingue entre si, e a distinção não
  // muda nada no planejamento — o que importa é que é cardio.
  "stationary bike": "cardio",
  "elliptical machine": "cardio",
  "stepmill machine": "cardio",
  "skierg machine": "cardio",
  "upper body ergometer": "cardio",

  // Acessórios sem equivalente próprio no enum.
  "medicine ball": "other",
  "stability ball": "other",
  "bosu ball": "other",
  roller: "other",
  "wheel roller": "other",
  tire: "other",
};

/**
 * `body_part` → tipo de exercício (`category_t`).
 *
 * O único caso em que a região determina o tipo é `cardio`. Todo o resto é
 * treino de força até prova em contrário — e "prova em contrário" exigiria
 * curadoria manual sobre 1.324 itens, que este script não tem como fazer.
 */
export const GV_CATEGORY_MAP = {
  cardio: "cardio",
};

/** Região do corpo → músculo usado quando `target` não mapeia. */
export const GV_BODY_PART_FALLBACK = {
  waist: "abs",
  "upper legs": "quads",
  back: "back",
  "lower legs": "calves",
  chest: "chest",
  "upper arms": "biceps",
  cardio: "cardio",
  shoulders: "shoulders",
  "lower arms": "forearms",
  neck: "neck",
};
