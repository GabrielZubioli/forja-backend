/**
 * Falha se `packages/db/src/types.ts` não corresponder mais ao schema.
 *
 * ## Por que não é só um `git diff`
 *
 * A pergunta que este check existe para responder é estreita: *alguém mexeu no
 * schema e esqueceu de regerar os tipos?* Duas diferenças aparecem no diff cru
 * sem responder nada disso:
 *
 * 1. **Formatação.** O arquivo versionado passa pelo Prettier junto com o resto
 *    do repo; a saída do `supabase gen types` vem sem formatação nenhuma.
 * 2. **`__InternalSupabase`.** O bloco carrega a versão do PostgREST do servidor
 *    que gerou os tipos — 14.5 no projeto remoto, outra no Postgres que o CI
 *    sobe do zero. É uma propriedade do servidor, não do schema.
 *
 * Um `git diff --exit-code` falha nas duas e transforma o check em ruído que
 * todo mundo aprende a ignorar. Aqui as duas são normalizadas **só para a
 * comparação** — o arquivo versionado continua com tudo.
 *
 * Uso: node scripts/check-types.mjs [--local]
 */

import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import * as prettier from "prettier";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const ARQUIVO = join(ROOT, "packages", "db", "src", "types.ts");
const local = process.argv.includes("--local");

/**
 * Remove o que varia por servidor e uniformiza a formatação.
 *
 * O `(\n\s*\/\/[^\n]*)*` no início não é enfeite: o gerador emite duas linhas de
 * comentário logo acima do `__InternalSupabase` explicando para que ele serve.
 * Tirar só o bloco e deixar os comentários órfãos mantém exatamente duas linhas
 * de divergência — que foi como este check falhou da primeira vez.
 */
async function normalizar(fonte) {
  const semInterno = fonte
    // A declaração e os comentários que a antecedem.
    .replace(/(\n\s*\/\/[^\n]*)*\n\s*__InternalSupabase:\s*\{[^}]*\};?/, "")
    // E a referência lá embaixo, no helper: quando o gerador não emite o bloco,
    // ele emite `= Database` direto em vez do Omit. Sem convergir as duas
    // formas, some a declaração e sobra a referência.
    .replace(/Omit<\s*Database\s*,\s*"__InternalSupabase"\s*>/g, "Database");

  return prettier.format(semInterno, { parser: "typescript", filepath: ARQUIVO });
}

const args = ["supabase", "gen", "types", "typescript", "--schema", "public"];
if (local) {
  args.push("--local");
} else {
  const toml = readFileSync(join(ROOT, "supabase", "config.toml"), "utf8");
  const ref = toml.match(/^\s*project_id\s*=\s*"([^"]+)"/m)?.[1];
  if (!ref) {
    console.error("Não achei 'project_id' em supabase/config.toml.");
    process.exit(1);
  }
  args.push("--project-id", ref);
}

const res = spawnSync("npx", args, {
  cwd: ROOT,
  encoding: "utf8",
  shell: process.platform === "win32",
  maxBuffer: 64 * 1024 * 1024,
});

if (res.status !== 0 || !res.stdout.includes("export type Database")) {
  console.error(res.stderr || "supabase gen types não devolveu um schema válido.");
  process.exit(res.status || 1);
}

const [gerado, versionado] = await Promise.all([
  normalizar(res.stdout),
  normalizar(readFileSync(ARQUIVO, "utf8")),
]);

if (gerado === versionado) {
  console.log("types.ts está em dia com o schema.");
  process.exit(0);
}

// Mostrar a primeira divergência é mais útil que despejar o arquivo inteiro:
// quem lê o log do CI quer saber *o que* mudou, não reler 1800 linhas.
const a = versionado.split("\n");
const b = gerado.split("\n");
const i = a.findIndex((linha, n) => linha !== b[n]);

console.error("::error::packages/db/src/types.ts não corresponde ao schema.");
console.error("::error::Rode 'npm run db:types' e commite o resultado.");
console.error(`\nPrimeira divergência, linha ${i + 1}:`);
console.error(`  versionado: ${a[i] ?? "(fim do arquivo)"}`);
console.error(`  gerado:     ${b[i] ?? "(fim do arquivo)"}`);
console.error(`\n(${Math.abs(a.length - b.length)} linha(s) de diferença no total)`);
process.exit(1);
