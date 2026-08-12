/**
 * Gera a migration de seed do catálogo de exercícios.
 *
 * Uso: `node scripts/catalog/build-exercises.mjs`
 *
 * ## Enriquecer, não duplicar
 *
 * Os 68 exercícios que já existiam no banco são **atualizados** (imagens,
 * execução, padrão de movimento, nível), nunca recriados. O histórico de treino
 * do usuário aponta para esses `exercise_id`; inserir cópias novas deixaria todo
 * o passado apontando para exercícios órfãos e duplicaria a biblioteca.
 *
 * O casamento é por nome exato em português, via `CORE_PT` — não por
 * similaridade. Comparar "Supino Reto com Barra" com "Barbell Bench Press" por
 * heurística acertaria a maioria e erraria silenciosamente o resto, que é o
 * pior modo de falha possível num seed.
 *
 * ## Saída
 *
 * Uma migration idempotente: `ON CONFLICT (external_id)` atualiza em vez de
 * duplicar, então rodar duas vezes é seguro.
 */
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { translateExerciseName } from "./translate.mjs";
import {
  CATEGORY_MAP,
  EQUIPMENT_MAP,
  LEVEL_MAP,
  MUSCLE_MAP,
  imageUrls,
  inferContraindications,
  inferMovementPattern,
  inferPopularity,
  muscleContributions,
} from "./mappers.mjs";
import { CORE_PT } from "./core-pt.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, "..", "..");
const SOURCE =
  "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/dist/exercises.json";
const CACHE = join(HERE, ".cache-exercises.json");
const OUT = join(ROOT, "supabase", "migrations", "20260804110000_seed_exercise_catalog.sql");

/** Aspas simples em SQL escapam-se dobrando. `null` para valores ausentes. */
const q = (v) =>
  v === null || v === undefined || v === "" ? "NULL" : `'${String(v).replace(/'/g, "''")}'`;
const qArray = (arr) =>
  !arr || arr.length === 0 ? "NULL" : `ARRAY[${arr.map((v) => q(v)).join(",")}]::TEXT[]`;
const qMuscleArray = (arr) =>
  !arr || arr.length === 0
    ? "'{}'::public.muscle_t[]"
    : `ARRAY[${arr.map((v) => q(v)).join(",")}]::public.muscle_t[]`;

async function loadSource() {
  if (existsSync(CACHE)) return JSON.parse(readFileSync(CACHE, "utf8"));
  const res = await fetch(SOURCE);
  if (!res.ok) throw new Error(`Falha ao baixar o catálogo: HTTP ${res.status}`);
  const json = await res.json();
  writeFileSync(CACHE, JSON.stringify(json));
  return json;
}

const source = await loadSource();
const byExternalId = new Map(source.map((e) => [e.id, e]));

// --- Validação do mapeamento curado -----------------------------------------
// Um `externalId` errado passaria despercebido e o exercício ficaria sem
// imagem. Falhar aqui é muito mais barato que descobrir na tela.
const missing = Object.entries(CORE_PT)
  .filter(([, v]) => !byExternalId.has(v.externalId))
  .map(([name, v]) => `${name} → ${v.externalId}`);
if (missing.length) {
  console.error("externalId inexistente na base de origem:\n  " + missing.join("\n  "));
  process.exit(1);
}

const curatedIds = new Set(Object.values(CORE_PT).map((v) => v.externalId));

/** Converte uma entrada da base de origem no conjunto de colunas do banco. */
function toRow(e, ptName, curated) {
  const pattern = inferMovementPattern(e);
  const secondary = (e.secondaryMuscles ?? []).map((m) => MUSCLE_MAP[m]).filter(Boolean);

  return {
    externalId: e.id,
    name: ptName,
    nameEn: e.name,
    category: CATEGORY_MAP[e.category] ?? "strength",
    equipment: EQUIPMENT_MAP[e.equipment] ?? "other",
    primaryMuscle: MUSCLE_MAP[e.primaryMuscles[0]] ?? "full_body",
    secondaryMuscles: [...new Set(secondary)],
    level: LEVEL_MAP[e.level] ?? "intermediate",
    mechanic: e.mechanic ?? null,
    forceType: e.force ?? null,
    movementPattern: pattern,
    // Instruções originais em inglês. A UI as exibe rotuladas como tal quando
    // não há execução curada — melhor que uma tradução automática ruim
    // fingindo ser conteúdo próprio.
    instructions: (e.instructions ?? []).join(" "),
    execution: curated?.execution ?? null,
    cues: curated?.cues ?? null,
    mistakes: curated?.mistakes ?? null,
    cadence: curated?.cadence ?? null,
    images: imageUrls(e),
    contraindications: inferContraindications(e, pattern),
    // Exercício curado é, por definição, dos que se prescreve: entra no topo.
    popularity: curated ? 95 : inferPopularity(e, pattern),
    muscles: muscleContributions(e),
  };
}

const updates = [];
const inserts = [];

for (const [ptName, curated] of Object.entries(CORE_PT)) {
  updates.push({ ptName, row: toRow(byExternalId.get(curated.externalId), ptName, curated) });
}

for (const e of source) {
  if (curatedIds.has(e.id)) continue;
  inserts.push(toRow(e, translateExerciseName(e.name, e.primaryMuscles[0]), null));
}

// --- Geração do SQL ---------------------------------------------------------

const lines = [];
const w = (s = "") => lines.push(s);

w(`-- Seed do catálogo de exercícios — GERADO por scripts/catalog/build-exercises.mjs`);
w(`--`);
w(`-- Fonte: free-exercise-db (domínio público) — ${source.length} exercícios,`);
w(`-- cada um com duas imagens da demonstração (início e fim do movimento).`);
w(`--`);
w(`-- ${updates.length} exercícios já existentes são **atualizados** (o histórico de treino`);
w(`-- aponta para os IDs deles); ${inserts.length} são inseridos.`);
w(`--`);
w(`-- Execução em português: escrita à mão para os ${updates.length} do núcleo — os que o`);
w(`-- gerador de plano prescreve. Os demais trazem a descrição original em inglês,`);
w(`-- que a UI exibe rotulada como tal em vez de fingir tradução própria.`);
w(`--`);
w(`-- Idempotente: reexecutar atualiza, não duplica.`);
w();

w(`-- ============================================ enriquecimento dos existentes`);
w();
for (const { ptName, row } of updates) {
  w(`UPDATE public.exercises SET`);
  w(`  external_id = ${q(row.externalId)},`);
  w(`  name_en = ${q(row.nameEn)},`);
  w(`  level = ${q(row.level)}::public.exercise_level_t,`);
  w(`  mechanic = ${row.mechanic ? `${q(row.mechanic)}::public.mechanic_t` : "NULL"},`);
  w(`  force_type = ${row.forceType ? `${q(row.forceType)}::public.force_type_t` : "NULL"},`);
  w(`  movement_pattern = ${q(row.movementPattern)}::public.movement_pattern_t,`);
  w(`  execution = ${qArray(row.execution)},`);
  w(`  cues = ${qArray(row.cues)},`);
  w(`  common_mistakes = ${qArray(row.mistakes)},`);
  w(`  default_cadence = ${q(row.cadence)},`);
  w(`  image_urls = ${qArray(row.images)},`);
  w(`  instructions = COALESCE(instructions, ${q(row.instructions)}),`);
  w(`  contraindications = ${qArray(row.contraindications)},`);
  w(`  popularity = ${row.popularity},`);
  w(`  secondary_muscles = ${qMuscleArray(row.secondaryMuscles)}`);
  w(`WHERE owner_id IS NULL AND name = ${q(ptName)};`);
  w();
}

w(`-- ==================================================== biblioteca completa`);
w();

// Em lotes: um único INSERT com 800 linhas gera uma instrução gigante que
// dificulta localizar o erro quando algo falha.
const CHUNK = 50;
const COLS = `(owner_id, external_id, name, name_en, category, equipment, primary_muscle, secondary_muscles,
   level, mechanic, force_type, movement_pattern, instructions, image_urls, contraindications, popularity, is_public)`;

for (let i = 0; i < inserts.length; i += CHUNK) {
  const chunk = inserts.slice(i, i + CHUNK);
  w(`INSERT INTO public.exercises`);
  w(`  ${COLS}`);
  w(`VALUES`);
  w(
    chunk
      .map(
        (r) =>
          `  (NULL, ${q(r.externalId)}, ${q(r.name)}, ${q(r.nameEn)}, ${q(r.category)}::public.exercise_category_t, ` +
          `${q(r.equipment)}::public.equipment_t, ${q(r.primaryMuscle)}::public.muscle_t, ${qMuscleArray(r.secondaryMuscles)}, ` +
          `${q(r.level)}::public.exercise_level_t, ${r.mechanic ? `${q(r.mechanic)}::public.mechanic_t` : "NULL"}, ` +
          `${r.forceType ? `${q(r.forceType)}::public.force_type_t` : "NULL"}, ${q(r.movementPattern)}::public.movement_pattern_t, ` +
          `${q(r.instructions)}, ${qArray(r.images)}, ${qArray(r.contraindications)}, ${r.popularity}, TRUE)`,
      )
      .join(",\n"),
  );
  // O índice único de `external_id` é parcial (ignora exercícios criados pelo
  // usuário, que não têm um). O Postgres só infere o índice se o `ON CONFLICT`
  // repetir o mesmo predicado.
  w(`ON CONFLICT (external_id) WHERE external_id IS NOT NULL DO UPDATE SET`);
  w(`  name = EXCLUDED.name, name_en = EXCLUDED.name_en, image_urls = EXCLUDED.image_urls,`);
  w(`  level = EXCLUDED.level, mechanic = EXCLUDED.mechanic, force_type = EXCLUDED.force_type,`);
  w(`  movement_pattern = EXCLUDED.movement_pattern, instructions = EXCLUDED.instructions,`);
  w(`  contraindications = EXCLUDED.contraindications, popularity = EXCLUDED.popularity,`);
  w(`  secondary_muscles = EXCLUDED.secondary_muscles;`);
  w();
}

w(`-- ======================================== contribuição muscular por exercício`);
w(`--`);
w(`-- Primário = 1; secundário = 0,5 em compostos e 0,35 em isolados. É o que`);
w(`-- permite ao mapa do corpo humano graduar a intensidade do destaque e ao`);
w(`-- cálculo de volume não contar uma série de supino como série cheia de tríceps.`);
w();

const allRows = [...updates.map((u) => u.row), ...inserts];
const muscleValues = [];
for (const r of allRows) {
  for (const m of r.muscles) {
    muscleValues.push(
      `  ((SELECT id FROM public.exercises WHERE external_id = ${q(r.externalId)}), ${q(m.muscle)}::public.muscle_t, ${m.contribution})`,
    );
  }
}

for (let i = 0; i < muscleValues.length; i += 200) {
  w(`INSERT INTO public.exercise_muscles (exercise_id, muscle, contribution)`);
  w(`VALUES`);
  w(muscleValues.slice(i, i + 200).join(",\n"));
  w(`ON CONFLICT (exercise_id, muscle) DO UPDATE SET contribution = EXCLUDED.contribution;`);
  w();
}

// Linhas cujo `external_id` não existe geram NULL no `exercise_id` — o que a
// PK barraria com erro. Limpar antes é mais claro que confiar no acaso.
w(`DELETE FROM public.exercise_muscles WHERE exercise_id IS NULL;`);
w();

writeFileSync(OUT, lines.join("\n"), "utf8");

console.log(`Migration escrita: ${OUT}`);
console.log(`  ${updates.length} exercícios enriquecidos`);
console.log(`  ${inserts.length} exercícios inseridos`);
console.log(`  ${muscleValues.length} contribuições musculares`);
console.log(`  ${(lines.join("\n").length / 1024).toFixed(0)} KB`);
