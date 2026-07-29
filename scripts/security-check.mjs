import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../", import.meta.url));
const read = (path) => readFileSync(join(root, path), "utf8");
const failures = [];
const requireMatch = (value, pattern, message) => {
  if (!pattern.test(value)) failures.push(message);
};

const html = read("index.html");
for (const directive of [
  "default-src 'self'",
  "script-src 'self'",
  "object-src 'none'",
  "base-uri 'none'",
  "form-action 'self'",
  "frame-src 'none'",
]) {
  if (!html.includes(directive)) failures.push(`CSP missing: ${directive}`);
}

const sql = read("supabase/setup.sql");
requireMatch(sql, /force row level security/i, "RLS must be forced");
requireMatch(sql, /revoke all on public\.user_data from anon/i, "anon privileges must be revoked");
requireMatch(sql, /user_data_payload_size/i, "database payload limit is missing");
for (const operation of ["select", "insert", "update", "delete"]) {
  requireMatch(sql, new RegExp(`for ${operation}[\\s\\S]*?auth\\.uid\\(\\)`, "i"), `RLS ${operation} policy is missing`);
}

const collect = (directory) => readdirSync(directory).flatMap((name) => {
  const path = join(directory, name);
  return statSync(path).isDirectory() ? collect(path) : [path];
});
const source = collect(join(root, "src")).map((path) => readFileSync(path, "utf8")).join("\n");
for (const [pattern, message] of [
  [/dangerouslySetInnerHTML/, "dangerouslySetInnerHTML is forbidden"],
  [/\beval\s*\(/, "eval is forbidden"],
  [/document\.write\s*\(/, "document.write is forbidden"],
  [/\bsb_secret_|\bservice_role\b/, "secret/service role material found in browser source"],
]) {
  if (pattern.test(source)) failures.push(message);
}

for (const workflow of collect(join(root, ".github", "workflows"))) {
  const text = readFileSync(workflow, "utf8");
  const unpinned = [...text.matchAll(/uses:\s+[^@\s]+@([^\s#]+)/g)]
    .filter(([, ref]) => !/^[a-f0-9]{40}$/.test(ref));
  if (unpinned.length) failures.push(`${workflow}: GitHub Action is not pinned to a commit SHA`);
}

if (failures.length) {
  console.error(failures.map((failure) => `- ${failure}`).join("\n"));
  process.exit(1);
}
console.log("Security invariants passed.");
