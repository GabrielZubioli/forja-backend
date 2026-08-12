/**
 * Liga o catálogo curado à mídia animada do `hasaneyldrm/exercises-dataset`.
 *
 * Uso: `node scripts/catalog/match-gymvisual-media.mjs`
 *
 * ## O problema
 *
 * O seed importou 1.324 exercícios com GIF, mas o catálogo que já existia —
 * ~760 movimentos com nome em português, para onde aponta todo o histórico de
 * treino — continuou com as fotos estáticas da free-exercise-db. A biblioteca
 * ficou com dois padrões visuais lado a lado.
 *
 * Casar por nome exato recuperou 112. O resto falha porque as duas bases
 * nomeiam de formas diferentes:
 *
 *     "Pushups"                  ×  "push-up"
 *     "Leg Press"                ×  "sled 45 degrees leg press"
 *     "Dumbbell Flyes"           ×  "dumbbell fly"
 *     "Barbell Bench Press - Medium Grip"  ×  "barbell bench press"
 *
 * ## Por que não é só "casar por semelhança"
 *
 * Semelhança de texto sozinha erra de um jeito perigoso: "Reverse Fly" e
 * "Dumbbell Fly" compartilham quase todos os caracteres e são exercícios de
 * músculos opostos. Um GIF errado numa biblioteca de referência é pior que GIF
 * nenhum — a pessoa executa o movimento errado achando que está certo.
 *
 * Por isso o casamento é **restringido antes de ser pontuado**: só entram
 * candidatos com o **mesmo músculo principal** e o **mesmo equipamento**. A
 * semelhança de texto só desempata dentro desse conjunto já seguro.
 *
 * Duas guardas adicionais:
 *
 * - **Piso de pontuação.** Abaixo dele, fica sem casar. Preferir a lacuna ao
 *   palpite é a regra.
 * - **Margem sobre o segundo colocado.** Se os dois melhores candidatos
 *   empatam, nenhum é escolhido: empate significa que o nome não distingue os
 *   dois, e escolher seria sortear.
 *
 * A saída é uma migration e um relatório do que casou, para revisão.
 */
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { GV_BODY_PART_FALLBACK, GV_EQUIPMENT_MAP, GV_MUSCLE_MAP } from "./gymvisual-maps.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, "..", "..");
const CACHE = join(HERE, ".cache-gymvisual.json");
const ALVOS = join(HERE, ".unmatched.json");
const OUT = join(ROOT, "supabase", "migrations", "20260810150000_link_curated_media.sql");
const RELATORIO = join(HERE, ".match-report.txt");

/** Pontuação mínima para aceitar um casamento. */
const PISO = 0.6;
/** Vantagem mínima do primeiro sobre o segundo colocado. */
const MARGEM = 0.08;

/**
 * Palavras que não distinguem exercícios.
 *
 * "Barbell Bench Press" e "Barbell Shoulder Press" compartilham duas de três
 * palavras; sem remover as genéricas, a pontuação premiaria o ruído. O
 * equipamento sai porque já é filtro obrigatório — mantê-lo na comparação
 * daria pontos por algo que todos os candidatos têm.
 */
const GENERICAS = new Set([
  "the",
  "a",
  "with",
  "on",
  "in",
  "to",
  "and",
  "of",
  "for",
  "your",
  "barbell",
  "dumbbell",
  "cable",
  "machine",
  "lever",
  "band",
  "kettlebell",
  "body",
  "weight",
  "bodyweight",
  "smith",
  "sled",
  "assisted",
  "weighted",
  "exercise",
  "version",
  "variation",
  "gym",
  "home",
]);

const tokens = (nome) =>
  nome
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .split(" ")
    .filter((t) => t.length > 1 && !GENERICAS.has(t))
    .map(singular);

/**
 * Singular de uma palavra.
 *
 * A ordem das regras importa e a primeira é a que mais custou: sem a guarda de
 * `ss`, "press" vira "pr" — o sufixo "es" casa no fim de "pre|ss". Isso não dá
 * erro nenhum, só faz o nome do movimento deixar de ser reconhecido, e com ele
 * some a proteção contra casar um pullover com um supino. Um bug silencioso
 * que desliga uma verificação de segurança é o pior tipo.
 */
function singular(palavra) {
  if (IRREGULARES[palavra]) return IRREGULARES[palavra];
  // "presses" → "press". Precisa vir antes da guarda de `ss`, senão a palavra
  // passa direto e o plural sobrevive.
  if (/sses$/.test(palavra)) return palavra.slice(0, -2);
  if (/ss$/.test(palavra)) return palavra;
  if (/(ch|sh|x|z)es$/.test(palavra)) return palavra.slice(0, -2);
  if (/ies$/.test(palavra) && palavra.length > 4) return `${palavra.slice(0, -3)}y`;
  if (/s$/.test(palavra)) return palavra.slice(0, -1);
  return palavra;
}

/** Plurais que nenhuma regra pega. */
const IRREGULARES = {
  flyes: "fly",
  flies: "fly",
  flys: "fly",
};

/**
 * Semelhança entre dois conjuntos de palavras (índice de Jaccard).
 *
 * Interseção sobre união: penaliza tanto o que falta quanto o que sobra. Só a
 * interseção faria "Press" casar perfeitamente com "Incline Dumbbell Bench
 * Press", porque toda palavra do primeiro está no segundo.
 */
function semelhanca(a, b) {
  if (a.length === 0 || b.length === 0) return 0;
  const sa = new Set(a);
  const sb = new Set(b);
  let comum = 0;
  for (const t of sa) if (sb.has(t)) comum += 1;
  return comum / (sa.size + sb.size - comum);
}

/**
 * O substantivo que nomeia o movimento.
 *
 * "Wide-Grip Decline Barbell Pullover" e "barbell decline wide-grip press"
 * compartilham três de quatro palavras e passam folgado em qualquer índice de
 * semelhança — mas um é pullover e o outro é supino. São exercícios diferentes,
 * com GIFs diferentes, e trocar um pelo outro numa biblioteca de referência faz
 * a pessoa executar o movimento errado achando que está certo.
 *
 * A regra corta essa classe inteira de erro: seja qual for a pontuação, o nome
 * do movimento precisa aparecer nos dois lados. Custa alguns casamentos
 * legítimos ("clean" × "power clean" sobrevive; "row" × "pulldown" não) e é um
 * preço que vale pagar.
 */
const MOVIMENTOS = [
  "press",
  "pullover",
  "fly",
  "raise",
  "row",
  "pulldown",
  "pullup",
  "chinup",
  "curl",
  "extension",
  "squat",
  "deadlift",
  "lunge",
  "thrust",
  "bridge",
  "crunch",
  "situp",
  "plank",
  "dip",
  "pushup",
  "pushdown",
  "shrug",
  "clean",
  "snatch",
  "jerk",
  "stretch",
  "twist",
  "kickback",
  "raise",
  "throw",
  "hold",
  "walk",
  "carry",
  "rotation",
  "abduction",
  "adduction",
  "crossover",
  "pullin",
];

function movimentoDe(tokensDoNome) {
  // Do fim para o começo: em inglês o substantivo do movimento fica no fim
  // ("barbell incline bench press"), e o começo é equipamento e qualificador.
  for (let i = tokensDoNome.length - 1; i >= 0; i -= 1) {
    if (MOVIMENTOS.includes(tokensDoNome[i])) return tokensDoNome[i];
  }
  return null;
}

function musculoDe(ex) {
  return GV_MUSCLE_MAP[ex.target] ?? GV_BODY_PART_FALLBACK[ex.body_part] ?? "full_body";
}

function main() {
  if (!existsSync(CACHE))
    throw new Error("Falta .cache-gymvisual.json — rode build-gymvisual.mjs.");
  if (!existsSync(ALVOS)) throw new Error("Falta .unmatched.json — exporte os alvos do banco.");

  const fonte = JSON.parse(readFileSync(CACHE, "utf8"));
  const bruto = readFileSync(ALVOS, "utf8");
  const alvos = JSON.parse(bruto.slice(bruto.indexOf("["), bruto.lastIndexOf("]") + 1));

  // Agrupa a fonte por (músculo, equipamento): é o balde de candidatos válidos.
  const baldes = new Map();
  for (const ex of fonte) {
    const chave = `${musculoDe(ex)}|${GV_EQUIPMENT_MAP[ex.equipment] ?? "other"}`;
    const lista = baldes.get(chave);
    const registro = { ...ex, tokens: tokens(ex.name) };
    if (lista) lista.push(registro);
    else baldes.set(chave, [registro]);
  }

  const casados = [];
  const rejeitados = [];

  for (const alvo of alvos) {
    const candidatos = baldes.get(`${alvo.muscle}|${alvo.equip}`) ?? [];
    if (candidatos.length === 0) {
      rejeitados.push({ ...alvo, motivo: "nenhum candidato com mesmo músculo e equipamento" });
      continue;
    }

    const alvoTokens = tokens(alvo.name_en);
    const alvoMovimento = movimentoDe(alvoTokens);

    const ranking = candidatos
      // Quando os dois nomes declaram um movimento, ele precisa ser o mesmo.
      // Se um dos lados não declara nenhum (nomes como "Butterfly", "Clean"),
      // a regra não se aplica e a pontuação decide sozinha.
      .filter((c) => {
        const movimento = movimentoDe(c.tokens);
        return !alvoMovimento || !movimento || alvoMovimento === movimento;
      })
      .map((c) => ({ c, score: semelhanca(alvoTokens, c.tokens) }))
      .sort((x, y) => y.score - x.score);

    if (ranking.length === 0) {
      rejeitados.push({ ...alvo, motivo: `nenhum candidato com o movimento "${alvoMovimento}"` });
      continue;
    }

    const [melhor, segundo] = ranking;

    if (melhor.score < PISO) {
      rejeitados.push({ ...alvo, motivo: `melhor score ${melhor.score.toFixed(2)} < ${PISO}` });
      continue;
    }
    if (segundo && melhor.score - segundo.score < MARGEM) {
      rejeitados.push({
        ...alvo,
        motivo: `empate: "${melhor.c.name}" (${melhor.score.toFixed(2)}) vs "${segundo.c.name}" (${segundo.score.toFixed(2)})`,
      });
      continue;
    }

    casados.push({
      id: alvo.id,
      nome: alvo.name,
      nameEn: alvo.name_en,
      alvoNome: melhor.c.name,
      externalId: melhor.c.id,
      mediaId: melhor.c.media_id,
      score: melhor.score,
    });
  }

  const q = (v) => `'${String(v).replace(/'/g, "''")}'`;

  /*
   * A vírgula vem **antes** do comentário.
   *
   * `(...)  -- nota,` põe a vírgula dentro do comentário de linha, e o
   * Postgres vê a lista de VALUES terminar no primeiro item. O erro que isso
   * gera (`syntax error at or near "("`) aponta para a linha seguinte, não
   * para a causa.
   */
  const updates = casados
    .map(
      (m, i) =>
        `  (${q(m.id)}::uuid, ${q(m.mediaId)}, ${q(`gymvisual:${m.externalId}`)})` +
        `${i < casados.length - 1 ? "," : ""}` +
        `  -- ${m.nome} → ${m.alvoNome} (${m.score.toFixed(2)})`,
    )
    .join("\n");

  const sql = `-- Liga o catálogo curado à mídia animada — GERADO POR SCRIPT, NÃO EDITAR À MÃO.
--
-- Regenerar: \`node scripts/catalog/match-gymvisual-media.mjs\`
--
-- Cada linha abaixo foi casada por semelhança de nome **dentro** do conjunto de
-- exercícios com o mesmo músculo principal e o mesmo equipamento, com piso de
-- pontuação e margem obrigatória sobre o segundo colocado. O comentário ao lado
-- traz o nome de origem e o score, para conferência.
--
-- O que **não** muda: \`name\`, \`name_en\`, \`external_id\`, \`instructions\` e
-- qualquer dado de treino. Só a origem da imagem.
--
-- \`media_ref\` guarda o identificador do exercício na fonte, que é a outra
-- metade do nome do arquivo (\`0001-2gPfomN.gif\`). O \`external_id\` da linha
-- continua sendo o nosso, porque é ele que o histórico e os seeds usam.

ALTER TABLE public.exercises
  ADD COLUMN IF NOT EXISTS media_ref TEXT;

COMMENT ON COLUMN public.exercises.media_ref IS
  'Id do exercício na fonte de mídia, quando difere de external_id. Ver src/data/exercise-media/providers.ts.';

UPDATE public.exercises AS e
SET media_id = v.media_id,
    media_ref = v.media_ref,
    media_source = 'gymvisual'
FROM (VALUES
${updates}
) AS v(id, media_id, media_ref)
WHERE e.id = v.id;
`;

  writeFileSync(OUT, sql);

  const relatorio = [
    `CASADOS: ${casados.length} de ${alvos.length}`,
    "",
    ...casados
      .sort((a, b) => a.score - b.score)
      .map((m) => `${m.score.toFixed(2)}  ${m.nameEn}  ->  ${m.alvoNome}`),
    "",
    `SEM CASAMENTO: ${rejeitados.length}`,
    "",
    ...rejeitados.map((r) => `  ${r.name_en}  (${r.motivo})`),
  ].join("\n");
  writeFileSync(RELATORIO, relatorio);

  console.log(`✔ ${casados.length} de ${alvos.length} casados → ${OUT}`);
  console.log(`  relatório completo: ${RELATORIO}`);
  console.log(`  ${rejeitados.length} ficam com a fonte atual (sem palpite).`);
  console.log("\n  10 casamentos de menor confiança (revise estes primeiro):");
  for (const m of casados.sort((a, b) => a.score - b.score).slice(0, 10)) {
    console.log(`    ${m.score.toFixed(2)}  ${m.nameEn.padEnd(38)} -> ${m.alvoNome}`);
  }
}

main();
