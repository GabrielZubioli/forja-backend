/**
 * Gera a migration de seed do catálogo estendido de exercícios.
 *
 * Uso: `node scripts/catalog/build-gymvisual.mjs`
 *
 * ## O que entra no banco e o que não entra
 *
 * **Entra:** nome (traduzido), nome em inglês, músculo principal e secundários,
 * equipamento, categoria, passo a passo em inglês, e os dois identificadores de
 * mídia. Tudo isso é dado, licenciado sob MIT pela fonte.
 *
 * **Não entra:** nenhum byte de imagem ou GIF. A mídia é © Gym visual e fica
 * onde está; o banco guarda só o identificador que permite montar a URL da CDN
 * em tempo de exibição. Desligar essa fonte é remover um item de uma lista em
 * `src/data/exercise-media/index.ts` — nenhuma migration, nenhum dado a apagar.
 *
 * ## Enriquecer, não duplicar
 *
 * `ON CONFLICT (external_id)` atualiza em vez de inserir de novo, então rodar
 * duas vezes é seguro. Mais importante: os exercícios que **já existem** com
 * nome em português (o núcleo curado, para onde apontam todas as séries já
 * registradas) são casados por nome normalizado e recebem apenas a mídia — o
 * nome deles nunca é sobrescrito por uma tradução automática.
 *
 * Sem esse cuidado, "Supino Reto com Barra" viraria "Supino Reto com Barra
 * Barbell" ou coisa pior, e o histórico de treino do usuário passaria a
 * apontar para um exercício com nome estranho.
 *
 * ## Tradução
 *
 * Os nomes passam pelo mesmo tradutor do seed original (`translate.mjs`), que
 * entende a inversão de ordem entre inglês e português ("Barbell Bench Press" →
 * "Supino Reto com Barra"). O `name_en` fica gravado: quem treina há anos
 * procura por "romanian deadlift", e a busca precisa achar.
 *
 * As **instruções** ficam em inglês, na coluna `execution_en`. O dataset traz
 * dez idiomas e nenhum é português; inventar uma tradução automática de texto
 * técnico de execução produziria instruções erradas sobre movimento com carga,
 * que é onde errar tem consequência física. A interface rotula o que exibe.
 */
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { translateExerciseName } from "./translate.mjs";
import {
  GV_BODY_PART_FALLBACK,
  GV_CATEGORY_MAP,
  GV_EQUIPMENT_MAP,
  GV_MUSCLE_MAP,
} from "./gymvisual-maps.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, "..", "..");
const SOURCE =
  "https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/data/exercises.json";
const CACHE = join(HERE, ".cache-gymvisual.json");
const OUT = join(ROOT, "supabase", "migrations", "20260810140000_seed_exercise_library.sql");

/** Aspas simples em SQL escapam-se dobrando. `NULL` para valores ausentes. */
const q = (v) =>
  v === null || v === undefined || v === "" ? "NULL" : `'${String(v).replace(/'/g, "''")}'`;

const qTextArray = (arr) =>
  !arr || arr.length === 0 ? "NULL" : `ARRAY[${arr.map((v) => q(v)).join(",")}]::TEXT[]`;

const qMuscleArray = (arr) =>
  !arr || arr.length === 0
    ? "'{}'::public.muscle_t[]"
    : `ARRAY[${arr.map((v) => q(v)).join(",")}]::public.muscle_t[]`;

/** Sem acento, sem caixa, sem pontuação — para casar nomes entre as fontes. */
const normalizar = (nome) =>
  nome
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9 ]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

async function loadSource() {
  if (existsSync(CACHE)) return JSON.parse(readFileSync(CACHE, "utf8"));
  const res = await fetch(SOURCE);
  if (!res.ok) throw new Error(`Falha ao baixar o dataset: HTTP ${res.status}`);
  const json = await res.json();
  writeFileSync(CACHE, JSON.stringify(json));
  return json;
}

/**
 * Popularidade — o que aparece primeiro na biblioteca.
 *
 * Com 1.324 exercícios, a ordem alfabética entrega "3/4 sit-up" e "45° side
 * bend" na primeira tela e enterra o supino reto. A pontuação empurra para
 * cima o que a maioria das pessoas realmente procura: equipamento comum,
 * movimento composto, músculo grande.
 *
 * É heurística, e assumidamente grosseira — mas qualquer ordem é melhor que a
 * alfabética, que é a única que garante que os primeiros resultados sejam
 * irrelevantes.
 */
function popularidade(ex, muscle, equipment) {
  let score = 40;

  if (["barbell", "dumbbell", "bodyweight"].includes(equipment)) score += 18;
  else if (["cable", "machine"].includes(equipment)) score += 10;
  else if (equipment === "other") score -= 15;

  if (["chest", "back", "quads", "shoulders", "glutes", "lats"].includes(muscle)) score += 12;
  if (["biceps", "triceps", "hamstrings", "abs"].includes(muscle)) score += 6;

  // Variações exóticas ficam no fim: quem procura por elas usa a busca.
  const nome = ex.name.toLowerCase();
  if (/(assisted|sled|tire|bosu|ergometer|skierg|stepmill|roller)/.test(nome)) score -= 20;

  return Math.max(1, Math.min(99, score));
}

function mapear(ex, avisos) {
  const equipment = GV_EQUIPMENT_MAP[ex.equipment];
  if (!equipment) avisos.equipamento.add(ex.equipment);

  const alvo = GV_MUSCLE_MAP[ex.target];
  if (!alvo) avisos.musculo.add(ex.target);
  const primary = alvo ?? GV_BODY_PART_FALLBACK[ex.body_part] ?? "full_body";

  const secundarios = [
    ...new Set(
      (ex.secondary_muscles ?? [])
        .map((m) => {
          const mapeado = GV_MUSCLE_MAP[m];
          if (!mapeado) avisos.musculo.add(m);
          return mapeado;
        })
        .filter(Boolean)
        // O secundário nunca deve repetir o principal: a UI listaria o mesmo
        // músculo duas vezes, uma como alvo e outra como apoio.
        .filter((m) => m !== primary),
    ),
  ];

  const category = GV_CATEGORY_MAP[ex.body_part] ?? "strength";
  const equipamentoFinal = equipment ?? "other";

  return {
    externalId: `gymvisual:${ex.id}`,
    name: translateExerciseName(ex.name, primary),
    nameEn: ex.name,
    category,
    equipment: equipamentoFinal,
    primary,
    secundarios,
    executionEn: ex.instruction_steps?.en ?? [],
    mediaId: ex.media_id,
    popularity: popularidade(ex, primary, equipamentoFinal),
  };
}

async function main() {
  const bruto = await loadSource();
  const avisos = { equipamento: new Set(), musculo: new Set() };

  const linhas = bruto.map((ex) => mapear(ex, avisos));

  // Nomes traduzidos podem colidir ("Barbell Curl" e "Barbell Biceps Curl"
  // viram o mesmo "Rosca Direta com Barra"). O `external_id` é único, então o
  // banco aceita os dois — mas a biblioteca mostraria duas linhas idênticas.
  // Desambigua com o equipamento e, se ainda colidir, com um contador.
  const vistos = new Map();
  for (const linha of linhas) {
    const chave = normalizar(linha.name);
    const anterior = vistos.get(chave) ?? 0;
    vistos.set(chave, anterior + 1);
    if (anterior > 0) linha.name = `${linha.name} (${anterior + 1})`;
  }

  const values = linhas
    .map(
      (l) =>
        `(NULL,${q(l.name)},${q(l.nameEn)},${q(l.category)},${q(l.equipment)},${q(l.primary)},` +
        `${qMuscleArray(l.secundarios)},${qTextArray(l.executionEn)},${q(l.externalId)},` +
        `${q(l.mediaId)},'gymvisual',${l.popularity},TRUE)`,
    )
    .join(",\n");

  const sql = `-- Biblioteca estendida de exercícios — GERADO POR SCRIPT, NÃO EDITAR À MÃO.
--
-- Fonte: https://github.com/hasaneyldrm/exercises-dataset (dados sob MIT)
-- Regenerar: \`node scripts/catalog/build-gymvisual.mjs\`
--
-- ## Licença da mídia
--
-- Nenhuma imagem é copiada para o banco. As colunas \`media_source\` e
-- \`media_id\` guardam apenas o identificador que o app usa para montar a URL
-- da CDN em tempo de exibição. A mídia em si é © Gym visual, sujeita aos termos
-- em https://gymvisual.com/content/3-terms-and-conditions-of-use, e o app exibe
-- a atribuição exigida junto de cada imagem.
--
-- ## Segurança sobre os dados existentes
--
-- \`ON CONFLICT (external_id)\` atualiza em vez de duplicar — rodar de novo é
-- seguro. E o \`UPDATE\` no fim casa o catálogo curado (nomes em português, para
-- onde aponta todo o histórico de treino) com a mídia da nova fonte **sem
-- tocar no nome**: nenhuma série já registrada muda de exercício.

INSERT INTO public.exercises
  (owner_id, name, name_en, category, equipment, primary_muscle,
   secondary_muscles, execution_en, external_id, media_id, media_source, popularity, is_public)
VALUES
${values}
-- O \`WHERE\` do índice precisa ser repetido aqui: \`idx_exercises_external_id\` é
-- um índice único **parcial**, e o Postgres só o considera como alvo de
-- conflito quando o predicado é informado. Sem isso a migration falha com
-- "there is no unique or exclusion constraint matching the ON CONFLICT
-- specification".
ON CONFLICT (external_id) WHERE external_id IS NOT NULL DO UPDATE SET
  name_en           = EXCLUDED.name_en,
  category          = EXCLUDED.category,
  equipment         = EXCLUDED.equipment,
  primary_muscle    = EXCLUDED.primary_muscle,
  secondary_muscles = EXCLUDED.secondary_muscles,
  execution_en      = EXCLUDED.execution_en,
  media_id          = EXCLUDED.media_id,
  media_source      = EXCLUDED.media_source,
  popularity        = EXCLUDED.popularity;

-- Liga o catálogo curado à mídia animada.
--
-- Casa por \`name_en\` normalizado e só preenche onde ainda não há mídia. O nome
-- em português fica intocado, e o \`external_id\` original também — o que muda é
-- só de onde vem a imagem.
UPDATE public.exercises AS alvo
SET media_id = fonte.media_id,
    media_source = 'gymvisual'
FROM public.exercises AS fonte
WHERE fonte.media_source = 'gymvisual'
  AND alvo.media_source IS NULL
  AND alvo.name_en IS NOT NULL
  AND lower(trim(alvo.name_en)) = lower(trim(fonte.name_en))
  AND alvo.id <> fonte.id;
`;

  writeFileSync(OUT, sql);

  console.log(`✔ ${linhas.length} exercícios → ${OUT}`);
  console.log(`  tamanho: ${(sql.length / 1024 / 1024).toFixed(2)} MB`);

  const duplicados = [...vistos.values()].filter((n) => n > 1).length;
  if (duplicados > 0) console.log(`  ${duplicados} nomes traduzidos colidiram e foram numerados.`);

  // Valores desconhecidos são reportados, nunca engolidos: é assim que um
  // vocabulário novo na fonte vira uma linha a acrescentar no mapa, em vez de
  // um exercício silenciosamente classificado errado.
  for (const [campo, conjunto] of Object.entries(avisos)) {
    if (conjunto.size > 0) {
      console.warn(`⚠ ${campo} sem mapeamento (${conjunto.size}):`, [...conjunto].join(", "));
    }
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
