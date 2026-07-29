import { readFileSync, statSync } from "node:fs";
import { join } from "node:path";

const root = new URL("..", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");
const main = readFileSync(join(root, "src", "main.tsx"), "utf8");
const styles = readFileSync(join(root, "src", "styles.css"), "utf8");
const levelBlock = main.match(/const programLevels:[\s\S]+?\n\];\n\nconst sessions/);

function requireCondition(condition, message) {
  if (!condition) throw new Error(message);
}

requireCondition(levelBlock, "No se encontró la configuración de niveles");
const levels = [...levelBlock[0].matchAll(/\n\s+level:\s+(\d),/g)].map(match => Number(match[1]));
requireCondition(
  JSON.stringify(levels) === JSON.stringify([1, 2, 3, 4, 5, 6, 7, 8]),
  `La progresión debe contener exactamente los niveles 1–8; encontrados: ${levels.join(", ")}`
);
requireCondition(main.includes('type SessionKey = "lunes" | "miercoles" | "viernes" | "caminar" | "intervalos" | "recuperar"'), "Falta la sesión por bloques");
requireCondition(main.includes('index === 5 && programLevel >= 5'), "La caminata por bloques debe liberarse en el Nivel 5");
requireCondition(main.includes("currentLevelDefinition.kettlebellRounds"), "La kettlebell debe progresar por vueltas");
requireCondition(main.includes("programLevel < 8"), "Los mensajes deben reconocer el nuevo Nivel 8");
requireCondition(main.includes("achievements = [") && main.includes("Campeón Ruta Fuerte"), "Faltan los logros de evolución");
requireCondition(styles.includes("grid-template-columns: repeat(2, minmax(0, 1fr))"), "Falta la cuadrícula móvil de avatares");

const avatar = statSync(join(root, "public", "avatar", "evolucion-8-niveles-optimizada.webp"));
requireCondition(avatar.size <= 250_000, `El avatar optimizado pesa demasiado: ${avatar.size} bytes`);

console.log(`Progresión verificada: 8 niveles y avatar de ${Math.round(avatar.size / 1024)} KB.`);
