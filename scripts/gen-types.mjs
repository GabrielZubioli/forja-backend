/**
 * Gera `packages/db/src/types.ts` a partir do schema do Postgres.
 *
 * ## Por que um wrapper em vez de uma linha no package.json
 *
 * A versão óbvia seria:
 *
 *     supabase gen types typescript --project-id $SUPABASE_PROJECT_ID > ...
 *
 * Isso quebra no Windows: o npm executa scripts via `cmd.exe`, onde `$VAR` é
 * texto literal, não uma variável. O script rodaria com `--project-id` valendo
 * a string "$SUPABASE_PROJECT_ID" e falharia de um jeito confuso.
 *
 * Além disso, o ref do projeto **não é segredo** — já está versionado em
 * `supabase/config.toml`. Lê-lo de lá elimina uma variável de ambiente que
 * alguém teria que configurar em cada máquina e no CI. O único segredo real
 * continua sendo `SUPABASE_ACCESS_TOKEN`, que o CLI lê sozinho.
 *
 * Uso:
 *   node scripts/gen-types.mjs           # projeto remoto (config.toml)
 *   node scripts/gen-types.mjs --local   # banco local (requer Docker)
 */

import { spawnSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const CONFIG = join(ROOT, "supabase", "config.toml");
const OUT = join(ROOT, "packages", "db", "src", "types.ts");

const local = process.argv.includes("--local");

/** Extrai `project_id = "..."` do config.toml — TOML raso não justifica um parser. */
function projectId() {
  const toml = readFileSync(CONFIG, "utf8");
  const match = toml.match(/^\s*project_id\s*=\s*"([^"]+)"/m);
  if (!match) {
    console.error(`Não achei 'project_id' em ${CONFIG}.`);
    process.exit(1);
  }
  return match[1];
}

const args = ["supabase", "gen", "types", "typescript", "--schema", "public"];
args.push(...(local ? ["--local"] : ["--project-id", projectId()]));

const alvo = local ? "banco local" : `projeto ${projectId()}`;
console.log(`Gerando tipos do ${alvo}...`);

const res = spawnSync("npx", args, {
  cwd: ROOT,
  encoding: "utf8",
  shell: process.platform === "win32",
  maxBuffer: 64 * 1024 * 1024,
});

if (res.status !== 0) {
  console.error(res.stderr || `supabase gen types saiu com código ${res.status}`);
  process.exit(res.status ?? 1);
}

// O CLI escreve o arquivo inteiro no stdout. Uma saída curta demais significa
// que algo deu errado sem código de erro (sessão expirada, projeto pausado) —
// gravar isso por cima do contrato apagaria o arquivo bom.
if (!res.stdout.includes("export type Database") || res.stdout.length < 1000) {
  console.error("Saída do 'gen types' não parece um schema válido. types.ts não foi tocado.");
  console.error(res.stdout.slice(0, 500));
  process.exit(1);
}

writeFileSync(OUT, res.stdout, "utf8");
console.log(`Escrito: ${OUT} (${res.stdout.split("\n").length} linhas)`);
