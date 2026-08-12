/**
 * Gera a migration de seed do banco de alimentos.
 *
 * Uso: `node scripts/catalog/build-foods.mjs`
 *
 * ## Fonte
 *
 * TACO — Tabela Brasileira de Composição de Alimentos (NEPA/Unicamp), 597
 * alimentos com macros **e** micronutrientes, já em português. É a referência
 * oficial brasileira: dados de alimentos in natura e preparações daqui, não a
 * adaptação de uma tabela americana onde "cheese" cobre trinta queijos que não
 * existem no mercado local.
 *
 * O banco tinha 25 alimentos. Um app de nutrição com 25 alimentos trava o
 * usuário no primeiro almoço.
 *
 * ## O que fica de fora
 *
 * Industrializados de marca (whey X, barra Y) **não** vêm daqui — a TACO não os
 * cobre e nem deveria. Esses entram pela busca ao vivo na Open Food Facts, que
 * tem código de barras e imagem, e são copiados para `foods` ao serem usados.
 * A separação é deliberada: dado oficial estável no seed, catálogo volátil de
 * marcas sob demanda.
 */
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, "..", "..");
const SOURCE =
  "https://raw.githubusercontent.com/marcelosanto/tabela_taco/main/tabela_alimentos.json";
const CACHE = join(HERE, ".cache-taco.json");
const OUT = join(ROOT, "supabase", "migrations", "20260804120000_seed_food_catalog.sql");

const q = (v) =>
  v === null || v === undefined || v === "" ? "NULL" : `'${String(v).replace(/'/g, "''")}'`;

/**
 * Converte um valor da TACO em número.
 *
 * A tabela usa dois marcadores não numéricos, com significados diferentes:
 * - `"Tr"` = traço — presente em quantidade abaixo do limite de detecção. Vira
 *   0: é a leitura correta e permite somar.
 * - `""` / `"NA"` = **não analisado**. Vira `NULL`, não 0 — dizer "0 mg de
 *   ferro" quando ninguém mediu é inventar dado, e o app exibiria uma
 *   deficiência que não existe.
 */
function num(v) {
  if (v === "Tr") return 0;
  if (v === "" || v === "NA" || v === null || v === undefined || v === "*") return null;
  const n = Number(v);
  return Number.isFinite(n) ? Math.round(n * 100) / 100 : null;
}

/**
 * Número obrigatório (macros): ausente vira 0, porque a coluna é NOT NULL.
 *
 * Negativos também viram 0. A TACO calcula carboidrato **por diferença**
 * (100 − água − proteína − lipídeo − cinzas − fibra), e em alimentos sem
 * carboidrato algum o arredondamento das outras frações às vezes cruza o zero:
 * "Corimba, cru" aparece com −0,03 g. É ruído de arredondamento, não
 * informação — e a constraint de integridade do banco corretamente o rejeita.
 */
const num0 = (v) => Math.max(0, num(v) ?? 0);

/** Categoria da TACO → `food_category_t`. */
const CATEGORY_MAP = {
  "Carnes e derivados": "protein_meat",
  "Pescados e frutos do mar": "protein_meat",
  "Ovos e derivados": "protein_egg",
  "Leite e derivados": "dairy",
  "Leguminosas e derivados": "legume",
  "Cereais e derivados": "grain",
  "Verduras, hortaliças e derivados": "vegetable",
  "Frutas e derivados": "fruit",
  "Gorduras e óleos": "fat",
  "Nozes e sementes": "fat",
  "Bebidas (alcoólicas e não alcoólicas)": "beverage",
  "Produtos açucarados": "sweet",
  "Alimentos preparados": "prepared",
  Miscelâneas: "other",
  "Outros alimentos industrializados": "other",
};

/**
 * Tubérculos saem de "Verduras, hortaliças e derivados" pelo nome.
 *
 * A TACO agrupa batata e mandioca com alface. Para macros isso é indiferente,
 * mas para **substituição** é decisivo: trocar batata por alface mantém a
 * categoria e destrói a refeição. A categoria existe para dizer "isto ocupa o
 * mesmo papel no prato".
 */
const TUBER_RE = /^(batata|mandioca|inhame|cará|car[aá]|mandioquinha|batata-doce|batata doce)/i;

/**
 * Elegível para composição automática de dieta.
 *
 * Nem tudo que se registra se prescreve. Bebida alcoólica, doce e preparações
 * muito específicas ("feijoada") continuam pesquisáveis, mas o gerador não os
 * escolhe sozinho — recomendar cachaça no café da manhã porque os macros
 * fecharam seria tecnicamente correto e obviamente errado.
 */
function isStaple(name, category) {
  if (["sweet", "beverage", "other"].includes(category)) return false;
  const n = name.toLowerCase();
  if (/frito|fritura|torresmo|bacon|linguiça|salsicha|mortadela|presunto|salame/.test(n))
    return false;
  if (/conserva|enlatad|em calda|cristalizad/.test(n)) return false;
  if (category === "prepared") return false;
  return true;
}

/**
 * Popularidade relativa (0–100), que ordena a busca.
 *
 * Quem digita "frango" espera "peito de frango, grelhado" no topo, não "frango,
 * coração, cru". Sem esse desempate, a ordem alfabética coloca miúdos antes de
 * cortes comuns.
 */
function popularity(name, category) {
  const n = name.toLowerCase();
  let score = 50;

  if (
    /^(arroz|feijão|frango|carne|ovo|leite|pão|banana|maçã|batata|macarrão|queijo|iogurte|aveia)/.test(
      n,
    )
  )
    score += 25;
  if (/cru$|, cru|crua/.test(n)) score -= 10;
  if (/miúdo|coração|fígado|moela|língua|rim|tripa|bucho|dobradinha|sarapatel/.test(n)) score -= 25;
  if (/cozid|grelhad|assad/.test(n)) score += 10;
  if (category === "protein_meat" || category === "grain" || category === "fruit") score += 5;

  return Math.max(0, Math.min(100, score));
}

async function load() {
  if (existsSync(CACHE)) return JSON.parse(readFileSync(CACHE, "utf8"));
  const res = await fetch(SOURCE);
  if (!res.ok) throw new Error(`Falha ao baixar a TACO: HTTP ${res.status}`);
  const json = await res.json();
  writeFileSync(CACHE, JSON.stringify(json));
  return json;
}

const source = await load();

const rows = source.map((f) => {
  const name = String(f.description).trim();
  let category = CATEGORY_MAP[f.category] ?? "other";
  if (category === "vegetable" && TUBER_RE.test(name)) category = "tuber";

  return {
    externalId: `taco:${f.id}`,
    name,
    category,
    // A TACO reporta tudo por 100 g — a mesma convenção de `serving_size_g`.
    kcal: num0(f.energy_kcal),
    protein: num0(f.protein_g),
    carbs: num0(f.carbohydrate_g),
    fat: num0(f.lipid_g),
    fiber: num0(f.fiber_g),
    saturated: num0(f.saturated_g),
    sodium: num0(f.sodium_mg),
    cholesterol: num(f.cholesterol_mg),
    calcium: num(f.calcium_mg),
    iron: num(f.iron_mg),
    magnesium: num(f.magnesium_mg),
    phosphorus: num(f.phosphorus_mg),
    potassium: num(f.potassium_mg),
    zinc: num(f.zinc_mg),
    // A TACO traz retinol e RAE separados; RAE é a medida moderna de vitamina A.
    vitaminA: num(f.rae_mcg) ?? num(f.retinol_mcg),
    vitaminC: num(f.vitaminC_mg),
    popularity: popularity(name, category),
    isStaple: isStaple(name, category),
  };
});

const lines = [];
const w = (s = "") => lines.push(s);

w(`-- Seed do banco de alimentos — GERADO por scripts/catalog/build-foods.mjs`);
w(`--`);
w(`-- Fonte: TACO — Tabela Brasileira de Composição de Alimentos (NEPA/Unicamp).`);
w(`-- ${rows.length} alimentos com macros e micronutrientes, todos por 100 g.`);
w(`--`);
w(`-- O banco tinha 25 alimentos. Industrializados de marca não entram aqui:`);
w(`-- vêm da Open Food Facts sob demanda (código de barras e imagem) e são`);
w(`-- copiados para esta tabela ao serem usados, para o histórico não depender`);
w(`-- de uma API externa continuar no ar.`);
w(`--`);
w(`-- Idempotente: reexecutar atualiza, não duplica.`);
w();

const COLS = `(owner_id, external_id, name, source, category, serving_size_g, serving_unit,
   kcal, protein_g, carbs_g, fat_g, fiber_g, saturated_fat_g, sodium_mg, cholesterol_mg,
   calcium_mg, iron_mg, magnesium_mg, phosphorus_mg, potassium_mg, zinc_mg,
   vitamin_a_mcg, vitamin_c_mg, popularity, is_staple, is_public)`;

const CHUNK = 60;
for (let i = 0; i < rows.length; i += CHUNK) {
  w(`INSERT INTO public.foods`);
  w(`  ${COLS}`);
  w(`VALUES`);
  w(
    rows
      .slice(i, i + CHUNK)
      .map(
        (r) =>
          `  (NULL, ${q(r.externalId)}, ${q(r.name)}, 'taco', ${q(r.category)}::public.food_category_t, 100, 'g', ` +
          `${r.kcal}, ${r.protein}, ${r.carbs}, ${r.fat}, ${r.fiber}, ${r.saturated}, ${r.sodium}, ${r.cholesterol ?? "NULL"}, ` +
          `${r.calcium ?? "NULL"}, ${r.iron ?? "NULL"}, ${r.magnesium ?? "NULL"}, ${r.phosphorus ?? "NULL"}, ${r.potassium ?? "NULL"}, ${r.zinc ?? "NULL"}, ` +
          `${r.vitaminA ?? "NULL"}, ${r.vitaminC ?? "NULL"}, ${r.popularity}, ${r.isStaple ? "TRUE" : "FALSE"}, TRUE)`,
      )
      .join(",\n"),
  );
  w(`ON CONFLICT (external_id) WHERE external_id IS NOT NULL DO UPDATE SET`);
  w(`  name = EXCLUDED.name, category = EXCLUDED.category, kcal = EXCLUDED.kcal,`);
  w(`  protein_g = EXCLUDED.protein_g, carbs_g = EXCLUDED.carbs_g, fat_g = EXCLUDED.fat_g,`);
  w(
    `  fiber_g = EXCLUDED.fiber_g, saturated_fat_g = EXCLUDED.saturated_fat_g, sodium_mg = EXCLUDED.sodium_mg,`,
  );
  w(
    `  cholesterol_mg = EXCLUDED.cholesterol_mg, calcium_mg = EXCLUDED.calcium_mg, iron_mg = EXCLUDED.iron_mg,`,
  );
  w(`  magnesium_mg = EXCLUDED.magnesium_mg, phosphorus_mg = EXCLUDED.phosphorus_mg,`);
  w(`  potassium_mg = EXCLUDED.potassium_mg, zinc_mg = EXCLUDED.zinc_mg,`);
  w(`  vitamin_a_mcg = EXCLUDED.vitamin_a_mcg, vitamin_c_mg = EXCLUDED.vitamin_c_mg,`);
  w(`  popularity = EXCLUDED.popularity, is_staple = EXCLUDED.is_staple;`);
  w();
}

// Os 25 alimentos originais não têm `external_id` nem categoria e ficariam
// invisíveis para as substituições. Classificá-los pelo nome é suficiente:
// são poucos e conhecidos.
w(`-- Classifica os 25 alimentos do seed original, que nasceram sem categoria.`);
w(`UPDATE public.foods SET category = CASE`);
w(`  WHEN name ~* '(frango|carne|patinho|tilápia|salmão|atum|peixe|peru)' THEN 'protein_meat'`);
w(`  WHEN name ~* 'ovo' THEN 'protein_egg'`);
w(`  WHEN name ~* '(leite|iogurte|queijo|requeijão|whey)' THEN 'dairy'`);
w(`  WHEN name ~* '(feijão|lentilha|grão-de-bico|soja|ervilha)' THEN 'legume'`);
w(`  WHEN name ~* '(arroz|aveia|pão|macarrão|tapioca|farinha|cuscuz|granola)' THEN 'grain'`);
w(`  WHEN name ~* '(batata|mandioca|inhame)' THEN 'tuber'`);
w(`  WHEN name ~* '(banana|maçã|laranja|mamão|abacate|morango|uva|manga|melancia)' THEN 'fruit'`);
w(`  WHEN name ~* '(azeite|óleo|castanha|amendoim|amêndoa|nozes|pasta de)' THEN 'fat'`);
w(`  WHEN name ~* '(brócolis|alface|tomate|cenoura|couve|abobrinha|espinafre)' THEN 'vegetable'`);
w(`  ELSE 'other'`);
w(`END::public.food_category_t`);
w(`WHERE owner_id IS NULL AND external_id IS NULL AND category = 'other';`);
w();
w(`UPDATE public.foods SET is_staple = TRUE, popularity = 85`);
w(`WHERE owner_id IS NULL AND external_id IS NULL AND category <> 'other';`);
w();

writeFileSync(OUT, lines.join("\n"), "utf8");

const staples = rows.filter((r) => r.isStaple).length;
console.log(`Migration escrita: ${OUT}`);
console.log(`  ${rows.length} alimentos (${staples} prescritíveis)`);
console.log(`  ${(lines.join("\n").length / 1024).toFixed(0)} KB`);
