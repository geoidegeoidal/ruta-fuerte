import { existsSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../", import.meta.url));
const source = readFileSync(join(root, "src", "main.tsx"), "utf8");
const guideStart = source.indexOf("const walkingGuide:");
const guideEnd = source.indexOf("const STORE_KEY");

if (guideStart < 0 || guideEnd < guideStart) {
  throw new Error("No se encontró el catálogo de guías.");
}

const exerciseNames = new Set(
  [...source.matchAll(/\{\s*name:\s*"([^"]+)"/g)].map((match) => match[1]),
);
const guideBlock = source.slice(guideStart, guideEnd);
const guideNames = new Set(
  [...guideBlock.matchAll(/^  "([^"]+)":/gm)].map((match) => match[1]),
);
const missingGuides = [...exerciseNames].filter((name) => !guideNames.has(name));

if (missingGuides.length) {
  throw new Error(`Faltan guías para: ${missingGuides.join(", ")}`);
}

const imageNames = new Set(
  [...guideBlock.matchAll(/exerciseImage\("([^"]+)"\)/g)].map((match) => match[1]),
);
const missingImages = [...imageNames].filter((name) => {
  const path = join(root, "public", "exercises", name);
  return !existsSync(path) || statSync(path).size < 20_000;
});

if (missingImages.length) {
  throw new Error(`Faltan imágenes válidas para: ${missingImages.join(", ")}`);
}

console.log(`${exerciseNames.size} ejercicios cubiertos por ${imageNames.size} ilustraciones.`);
