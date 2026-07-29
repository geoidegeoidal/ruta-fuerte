import React, { useEffect, useMemo, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import {
  cloudConfigured,
  googleAuthEnabled,
  readCloudStore,
  signInWithGoogle,
  supabase,
  writeCloudStore,
  type CloudUser,
} from "./cloud";
import "@fontsource-variable/manrope";
import "./styles.css";

type View = "hoy" | "historial" | "evolucion" | "logros" | "plan";
type Theme = "light" | "dark";
type SessionKey = "lunes" | "miercoles" | "viernes" | "caminar" | "recuperar";
type LogEntry = {
  id: string;
  date: string;
  weight?: number;
  systolic?: number;
  diastolic?: number;
  activeMinutes: number;
  steps?: number;
  water?: number;
  energy?: number;
  session?: SessionKey;
  sessionDone?: boolean;
  note?: string;
};
type Store = {
  logs: LogEntry[];
  checks: Record<string, boolean>;
  loads: Record<string, LoadProgress>;
  loadHistory: { date: string; name: string; kg: number }[];
  startedAt: string;
};
type LoadProgress = { kg: number; initialKg: number; comfortableDates: string[] };
type Exercise = {
  name: string;
  prescription: string;
  note?: string;
  load?: { initial: number; step: number; fixed?: boolean };
};
type ExerciseGuide = {
  image: string;
  alt: string;
  steps: [string, string, string];
  focus: string;
  breathing: string;
};
type GuideSelection = {
  name: string;
  prescription: string;
  guide: ExerciseGuide;
};

const exerciseImage = (file: string) => `${import.meta.env.BASE_URL}exercises/${file}`;
const walkingGuide: ExerciseGuide = {
  image: exerciseImage("treadmill-walk.jpg"),
  alt: "Secuencia de caminata erguida y controlada en caminadora",
  steps: [
    "Empieza lento y deja que el ritmo suba durante varios minutos.",
    "Camina erguido, con mirada al frente y brazos relajados.",
    "Baja el ritmo gradualmente antes de detenerte.",
  ],
  focus: "Usa el ritmo conversable: debes poder hablar en frases breves sin jadear.",
  breathing: "Respira de forma continua; no aguantes el aire.",
};
const cardioChoiceGuide: ExerciseGuide = {
  ...walkingGuide,
  image: exerciseImage("cardio-options.jpg"),
  alt: "Dos opciones de cardio suave: bicicleta reclinada y caminadora",
  focus: "En caminadora, camina erguido. En bicicleta reclinada, ajusta el asiento para no bloquear las rodillas.",
};
const calmGuide: ExerciseGuide = {
  image: exerciseImage("calm-breathing.jpg"),
  alt: "Hombre practicando respiración tranquila y consciente",
  steps: [
    "Ponte de pie o siéntate con espalda larga y hombros sueltos.",
    "Inhala suave por la nariz, sin elevar los hombros.",
    "Exhala lento y deja que el abdomen vuelva sin forzar.",
  ],
  focus: "La respiración debe sentirse cómoda. Si aparece mareo, vuelve a tu respiración normal.",
  breathing: "Nunca hagas pausas largas ni empujes el aire con fuerza.",
};
const exerciseGuides: Record<string, ExerciseGuide> = {
  "Bicicleta reclinada o caminadora": cardioChoiceGuide,
  "Bicicleta o caminadora": cardioChoiceGuide,
  "Caminar muy suave": walkingGuide,
  "Caminata muy suave": walkingGuide,
  "Caminata a ritmo conversable": walkingGuide,
  "Vuelta a la calma": walkingGuide,
  "Semanas 1–2": walkingGuide,
  "Semanas 3–4": walkingGuide,
  "Semanas 5–6": walkingGuide,
  "Semanas 7–8": walkingGuide,
  "Prensa de piernas": {
    image: exerciseImage("leg-press.jpg"),
    alt: "Secuencia de prensa de piernas en máquina",
    steps: [
      "Apoya espalda y cadera; coloca los pies al ancho de las caderas.",
      "Empuja siguiendo la línea de los pies, sin juntar las rodillas.",
      "Regresa lento hasta un ángulo cómodo, sin despegar la cadera.",
    ],
    focus: "No bloquees las rodillas al extender y evita bajar tanto que la pelvis se redondee.",
    breathing: "Exhala al empujar; inhala al regresar.",
  },
  "Press de pecho en máquina": {
    image: exerciseImage("chest-press.jpg"),
    alt: "Secuencia de press de pecho sentado en máquina",
    steps: [
      "Ajusta el asiento para que las manillas queden a la altura media del pecho.",
      "Mantén espalda y cabeza apoyadas; empuja al frente sin encoger hombros.",
      "Vuelve con control hasta que los codos queden apenas detrás del torso.",
    ],
    focus: "Muñecas rectas y hombros lejos de las orejas.",
    breathing: "Exhala al empujar; inhala al volver.",
  },
  "Remo sentado": {
    image: exerciseImage("seated-row.jpg"),
    alt: "Secuencia de remo sentado en polea",
    steps: [
      "Siéntate alto, con pies firmes y brazos extendidos sin redondear la espalda.",
      "Lleva los codos hacia atrás, cerca del cuerpo.",
      "Pausa y extiende los brazos lentamente sin inclinar el tronco.",
    ],
    focus: "El pecho se mantiene estable; no conviertas el movimiento en un balanceo.",
    breathing: "Exhala al tirar; inhala al extender.",
  },
  "Curl femoral": {
    image: exerciseImage("leg-curl.jpg"),
    alt: "Secuencia de curl femoral acostado en máquina",
    steps: [
      "Alinea la rodilla con el eje y deja el rodillo detrás de las pantorrillas.",
      "Dobla las rodillas acercando los talones sin levantar la cadera.",
      "Baja el peso lentamente sin dejar que golpee la torre.",
    ],
    focus: "La ilustración muestra la versión acostada; si la máquina es sentada, pide al instructor que ajuste eje y rodillos.",
    breathing: "Exhala al doblar; inhala al extender.",
  },
  "Jalón al pecho": {
    image: exerciseImage("lat-pulldown.jpg"),
    alt: "Secuencia de jalón de polea al pecho",
    steps: [
      "Sujeta la barra un poco más ancho que los hombros y fija los muslos.",
      "Baja la barra hacia la parte alta del pecho llevando codos hacia abajo.",
      "Sube con control hasta extender los brazos sin perder postura.",
    ],
    focus: "Lleva la barra por delante; no la pases detrás de la nuca ni te balancees.",
    breathing: "Exhala al bajar la barra; inhala al subir.",
  },
  "Elevación de talones": {
    image: exerciseImage("calf-raise.jpg"),
    alt: "Secuencia de elevación de talones con apoyo",
    steps: [
      "Apoya la parte delantera del pie y mantén las rodillas suaves.",
      "Eleva los talones sin inclinar el cuerpo hacia delante.",
      "Desciende despacio hasta un estiramiento cómodo.",
    ],
    focus: "Usa apoyo estable y reparte el peso entre ambos pies.",
    breathing: "Exhala al subir; inhala al bajar.",
  },
  "Extensión de piernas": {
    image: exerciseImage("leg-extension.jpg"),
    alt: "Secuencia de extensión de piernas sentada en máquina",
    steps: [
      "Alinea la rodilla con el eje y el rodillo sobre la parte baja de la tibia.",
      "Extiende las piernas sin patear ni bloquear las rodillas.",
      "Baja lento hasta la posición inicial.",
    ],
    focus: "Usa un rango sin dolor; si molesta la rodilla, omite el ejercicio.",
    breathing: "Exhala al extender; inhala al bajar.",
  },
  "Abducción de cadera": {
    image: exerciseImage("hip-abduction.jpg"),
    alt: "Secuencia de abducción de cadera sentada en máquina",
    steps: [
      "Apoya espalda y pies, con las almohadillas por fuera de las piernas.",
      "Abre las rodillas sin inclinar el tronco.",
      "Regresa lento, evitando que las placas choquen.",
    ],
    focus: "Abre solo hasta donde puedas mantener la pelvis quieta.",
    breathing: "Exhala al abrir; inhala al cerrar.",
  },
  "Marcha, hombros y bisagra de cadera": {
    image: exerciseImage("march-warmup.jpg"),
    alt: "Marcha suave con movilidad de hombros para calentar",
    steps: [
      "Marcha suave alternando los pies y manteniendo una postura alta.",
      "Añade círculos pequeños de hombros, lejos de las orejas.",
      "Practica la bisagra llevando la cadera atrás con espalda neutra.",
    ],
    focus: "Todo debe ser suave y sin rebotes; la bisagra nace en la cadera, no en la cintura.",
    breathing: "Respira libremente durante toda la preparación.",
  },
  "Peso muerto con kettlebell": {
    image: exerciseImage("kettlebell-deadlift.jpg"),
    alt: "Secuencia de peso muerto con una kettlebell",
    steps: [
      "Pon la kettlebell entre los pies y lleva la cadera hacia atrás.",
      "Toma el asa con ambas manos y mantén la espalda neutra.",
      "Empuja el suelo y termina erguido, sin inclinarte hacia atrás.",
    ],
    focus: "La pesa sube cerca del cuerpo. Esto es peso muerto, no swing.",
    breathing: "Exhala al levantarte; inhala al bajar.",
  },
  "Sentarse y levantarse de una silla": {
    image: exerciseImage("chair-sit-stand.jpg"),
    alt: "Secuencia para sentarse y levantarse de una silla estable",
    steps: [
      "Usa una silla firme contra la pared y coloca los pies bajo las rodillas.",
      "Inclina el pecho un poco hacia delante y empuja el suelo para levantarte.",
      "Lleva la cadera atrás y siéntate despacio, sin dejarte caer.",
    ],
    focus: "Usa las manos como apoyo si lo necesitas; progresa cuando te sientas estable.",
    breathing: "Exhala al levantarte; inhala al sentarte.",
  },
  "Remo con apoyo": {
    image: exerciseImage("supported-row.jpg"),
    alt: "Secuencia de remo con kettlebell y una mano apoyada",
    steps: [
      "Apoya una mano en una superficie firme y lleva la cadera atrás.",
      "Con la espalda neutra, lleva el codo cargado hacia la cadera.",
      "Baja la pesa hasta extender el brazo sin girar el torso.",
    ],
    focus: "Mantén hombros y caderas apuntando al suelo.",
    breathing: "Exhala al remar; inhala al bajar.",
  },
  "Flexiones contra la pared": {
    image: exerciseImage("wall-pushup.jpg"),
    alt: "Secuencia de flexión de brazos contra la pared",
    steps: [
      "Pon las manos en la pared a la altura del pecho y da un paso atrás.",
      "Mantén el cuerpo alineado y dobla los codos acercando el pecho.",
      "Empuja la pared hasta volver, sin encoger los hombros.",
    ],
    focus: "Acércate a la pared si necesitas menos esfuerzo; aléjate solo cuando controles la postura.",
    breathing: "Inhala al acercarte; exhala al empujar.",
  },
  "Caminata con peso a un costado": {
    image: exerciseImage("suitcase-carry.jpg"),
    alt: "Caminata erguida con una kettlebell a un costado",
    steps: [
      "Toma la kettlebell a un lado y ponte alto con hombros nivelados.",
      "Camina con pasos cortos sin inclinarte hacia la pesa.",
      "Apoya la pesa con control y repite al otro lado.",
    ],
    focus: "Detente si no puedes evitar que el tronco se incline.",
    breathing: "Respira de forma continua durante toda la caminata.",
  },
  "Marcha en el lugar": {
    image: exerciseImage("march-warmup.jpg"),
    alt: "Secuencia de marcha suave en el lugar",
    steps: [
      "Ponte alto cerca de un apoyo estable.",
      "Eleva un pie y luego el otro a una altura cómoda.",
      "Mantén un ritmo continuo sin golpear el suelo.",
    ],
    focus: "La altura de la rodilla importa menos que mantener equilibrio y ritmo.",
    breathing: "Respira con normalidad; debes poder hablar.",
  },
  "Movilidad de hombros y cadera": {
    image: exerciseImage("mobility.jpg"),
    alt: "Secuencia de movilidad suave de hombros y cadera con apoyo",
    steps: [
      "Haz círculos pequeños y lentos con los hombros.",
      "Mueve la cadera en un rango cómodo, con apoyo si lo necesitas.",
      "Reduce el rango ante dolor o pérdida de equilibrio.",
    ],
    focus: "Busca soltura, no un estiramiento intenso. Evita rebotes.",
    breathing: "Exhala durante la parte que se sienta más tensa.",
  },
  "Respiración tranquila": calmGuide,
};

const STORE_KEY = "ruta-fuerte-data-v2";
const STORE_OWNER_KEY = "ruta-fuerte-owner-v1";
const THEME_KEY = "ruta-fuerte-theme-v1";
const MAX_BACKUP_BYTES = 1_000_000;
const MAX_NOTE_LENGTH = 500;
const today = () => new Date().toLocaleDateString("en-CA");
const loadTheme = (): Theme => {
  const saved = localStorage.getItem(THEME_KEY);
  if (saved === "light" || saved === "dark") return saved;
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
};
const dateLabel = (date: string, full = false) =>
  new Intl.DateTimeFormat("es-CL", full
    ? { weekday: "long", day: "numeric", month: "long" }
    : { day: "2-digit", month: "short" }).format(new Date(`${date}T12:00:00`));

const sessions: Record<SessionKey, {
  label: string; place: string; title: string; duration: number;
  blocks: { time: string; title: string; exercises: Exercise[] }[];
}> = {
  lunes: {
    label: "Lunes", place: "MindFit San Martín", title: "Fuerza A", duration: 60,
    blocks: [
      { time: "0–10", title: "Calentamiento", exercises: [{ name: "Bicicleta reclinada o caminadora", prescription: "10 min · suave", note: "Debes poder conversar." }] },
      { time: "10–45", title: "Cuerpo completo", exercises: [
          { name: "Prensa de piernas", prescription: "2 × 10–12", load: { initial: 20, step: 5 } },
          { name: "Press de pecho en máquina", prescription: "2 × 10–12", load: { initial: 5, step: 5 } },
          { name: "Remo sentado", prescription: "2 × 10–12", load: { initial: 10, step: 5 } },
          { name: "Curl femoral", prescription: "2 × 10–12", load: { initial: 5, step: 5 } },
          { name: "Jalón al pecho", prescription: "2 × 10–12", load: { initial: 10, step: 5 } },
          { name: "Elevación de talones", prescription: "2 × 12–15", load: { initial: 20, step: 5 } },
      ]},
      { time: "45–60", title: "Cardio + vuelta a la calma", exercises: [
        { name: "Bicicleta o caminadora", prescription: "10 min · moderado" },
        { name: "Caminar muy suave", prescription: "5 min", note: "No te detengas de golpe." },
      ]},
    ],
  },
  miercoles: {
    label: "Miércoles", place: "MindFit San Martín", title: "Fuerza B", duration: 60,
    blocks: [
      { time: "0–10", title: "Calentamiento", exercises: [{ name: "Bicicleta reclinada o caminadora", prescription: "10 min · suave" }] },
      { time: "10–45", title: "Cuerpo completo", exercises: [
          { name: "Prensa de piernas", prescription: "2 × 10–12", load: { initial: 20, step: 5 } },
          { name: "Press de pecho en máquina", prescription: "2 × 10–12", load: { initial: 5, step: 5 } },
          { name: "Remo sentado", prescription: "2 × 10–12", load: { initial: 10, step: 5 } },
          { name: "Extensión de piernas", prescription: "2 × 10–12", note: "Omítela si molesta la rodilla.", load: { initial: 5, step: 5 } },
          { name: "Jalón al pecho", prescription: "2 × 10–12", load: { initial: 10, step: 5 } },
          { name: "Abducción de cadera", prescription: "2 × 12–15", load: { initial: 10, step: 5 } },
      ]},
      { time: "45–60", title: "Cardio + vuelta a la calma", exercises: [
        { name: "Bicicleta o caminadora", prescription: "10 min · moderado" },
        { name: "Caminar muy suave", prescription: "5 min" },
      ]},
    ],
  },
  viernes: {
    label: "Viernes", place: "En casa · 12 kg", title: "Kettlebell", duration: 25,
    blocks: [
      { time: "0–6", title: "Preparar el cuerpo", exercises: [{ name: "Marcha, hombros y bisagra de cadera", prescription: "6 min · suave" }] },
      { time: "6–23", title: "Circuito · 2 vueltas", exercises: [
          { name: "Peso muerto con kettlebell", prescription: "10 rep", load: { initial: 12, step: 0, fixed: true } },
        { name: "Sentarse y levantarse de una silla", prescription: "10 rep" },
          { name: "Remo con apoyo", prescription: "8 por lado", load: { initial: 12, step: 0, fixed: true } },
        { name: "Flexiones contra la pared", prescription: "10 rep" },
          { name: "Caminata con peso a un costado", prescription: "20–30 s/lado", load: { initial: 12, step: 0, fixed: true } },
        { name: "Marcha en el lugar", prescription: "60 s" },
      ]},
    ],
  },
  caminar: {
    label: "Caminata", place: "Afuera o caminadora", title: "Cardio conversable", duration: 20,
    blocks: [{ time: "HOY", title: "Según tu semana", exercises: [
      { name: "Semanas 1–2", prescription: "15 min · 2 días" },
      { name: "Semanas 3–4", prescription: "20 min · 3 días" },
      { name: "Semanas 5–6", prescription: "25 min · 3 días" },
      { name: "Semanas 7–8", prescription: "30 min · 3 días", note: "Si cuesta hablar, baja el ritmo." },
    ]}],
  },
  recuperar: {
    label: "Recuperar", place: "En casa o al aire libre", title: "Movilidad suave", duration: 15,
    blocks: [{ time: "15 MIN", title: "Mover sin exigir", exercises: [
      { name: "Caminata muy suave", prescription: "8 min" },
      { name: "Movilidad de hombros y cadera", prescription: "4 min", note: "Sin rebotes ni dolor." },
      { name: "Respiración tranquila", prescription: "3 min", note: "Inhala y exhala sin aguantar el aire." },
    ]}],
  },
};

const loadCatalog = Array.from(
  new Map(
    Object.values(sessions)
      .flatMap(session => session.blocks.flatMap(block => block.exercises))
      .filter(exercise => exercise.load)
      .map(exercise => [exercise.name, exercise] as const)
  ).values()
);

const initialStore: Store = { logs: [], checks: {}, loads: {}, loadHistory: [], startedAt: today() };
const weeklySchedule: { day: string; short: string; key: SessionKey; detail: string }[] = [
  { day: "Lunes", short: "LUN", key: "lunes", detail: "Fuerza A" },
  { day: "Martes", short: "MAR", key: "caminar", detail: "Caminata" },
  { day: "Miércoles", short: "MIÉ", key: "miercoles", detail: "Fuerza B" },
  { day: "Jueves", short: "JUE", key: "recuperar", detail: "Recuperar" },
  { day: "Viernes", short: "VIE", key: "viernes", detail: "Kettlebell" },
  { day: "Sábado", short: "SÁB", key: "caminar", detail: "Caminata" },
  { day: "Domingo", short: "DOM", key: "recuperar", detail: "Descanso" },
];

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);
const safeText = (value: unknown, maxLength: number) =>
  typeof value === "string" ? value.slice(0, maxLength) : undefined;
const safeNumber = (value: unknown, min: number, max: number) =>
  typeof value === "number" && Number.isFinite(value) && value >= min && value <= max
    ? value
    : undefined;
const isDate = (value: unknown): value is string => {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [year, month, day] = value.split("-").map(Number);
  const parsed = new Date(Date.UTC(year, month - 1, day));
  return year >= 2000 && year <= 2100 &&
    parsed.getUTCFullYear() === year && parsed.getUTCMonth() === month - 1 && parsed.getUTCDate() === day;
};
const isSession = (value: unknown): value is SessionKey =>
  typeof value === "string" && ["lunes", "miercoles", "viernes", "caminar", "recuperar"].includes(value);

function normalizeStore(value: unknown): Store {
  if (!isRecord(value)) return { ...initialStore };
  const logs = Array.isArray(value.logs)
    ? value.logs.slice(-3660).flatMap((candidate): LogEntry[] => {
        if (!isRecord(candidate) || !isDate(candidate.date)) return [];
        return [{
          id: safeText(candidate.id, 100) || crypto.randomUUID(),
          date: candidate.date,
          weight: safeNumber(candidate.weight, 30, 400),
          systolic: safeNumber(candidate.systolic, 60, 260),
          diastolic: safeNumber(candidate.diastolic, 30, 160),
          activeMinutes: safeNumber(candidate.activeMinutes, 0, 1440) ?? 0,
          steps: safeNumber(candidate.steps, 0, 100000),
          water: safeNumber(candidate.water, 0, 50),
          energy: safeNumber(candidate.energy, 1, 5),
          session: isSession(candidate.session) ? candidate.session : undefined,
          sessionDone: typeof candidate.sessionDone === "boolean" ? candidate.sessionDone : undefined,
          note: safeText(candidate.note, MAX_NOTE_LENGTH),
        }];
      })
    : [];
  const checks: Record<string, boolean> = {};
  if (isRecord(value.checks)) {
    for (const [key, checked] of Object.entries(value.checks).slice(0, 10000)) {
      if (key.length <= 180 && typeof checked === "boolean") checks[key] = checked;
    }
  }
  const allowedLoads = new Map(loadCatalog.map(exercise => [exercise.name, exercise]));
  const loads: Record<string, LoadProgress> = {};
  if (isRecord(value.loads)) {
    for (const [name, candidate] of Object.entries(value.loads).slice(0, allowedLoads.size)) {
      const exercise = allowedLoads.get(name);
      if (!exercise?.load || !isRecord(candidate)) continue;
      const kg = safeNumber(candidate.kg, 0, 500);
      const initialKg = safeNumber(candidate.initialKg, 0, 500);
      if (kg === undefined || initialKg === undefined) continue;
      loads[name] = {
        kg,
        initialKg,
        comfortableDates: Array.isArray(candidate.comfortableDates)
          ? candidate.comfortableDates.filter(isDate).slice(-2)
          : [],
      };
    }
  }
  const loadHistory = Array.isArray(value.loadHistory)
    ? value.loadHistory.slice(-5000).flatMap(candidate => {
        if (!isRecord(candidate) || !isDate(candidate.date) ||
            typeof candidate.name !== "string" || !allowedLoads.has(candidate.name)) return [];
        const kg = safeNumber(candidate.kg, 0, 500);
        return kg === undefined ? [] : [{ date: candidate.date, name: candidate.name, kg }];
      })
    : [];
  return {
    logs,
    checks,
    loads,
    loadHistory,
    startedAt: isDate(value.startedAt) ? value.startedAt : today(),
  };
}

function loadStore(): Store {
  try {
    const saved = JSON.parse(localStorage.getItem(STORE_KEY) || "null");
    return normalizeStore(saved);
  } catch { /* start clean */ }
  return { ...initialStore };
}

function mergeStores(local: Store, remote: Partial<Store> | null): Store {
  const safeLocal = normalizeStore(local);
  if (!remote) return safeLocal;
  const safeRemote = normalizeStore(remote);
  const logs = new Map<string, LogEntry>();
  for (const log of [...safeRemote.logs, ...safeLocal.logs]) logs.set(log.date, log);
  const history = new Map<string, { date: string; name: string; kg: number }>();
  for (const event of [...safeRemote.loadHistory, ...safeLocal.loadHistory]) {
    history.set(`${event.date}-${event.name}-${event.kg}`, event);
  }
  return {
    ...initialStore,
    startedAt: [safeRemote.startedAt, safeLocal.startedAt].filter(Boolean).sort()[0] || today(),
    logs: [...logs.values()],
    checks: { ...safeRemote.checks, ...safeLocal.checks },
    loads: { ...safeRemote.loads, ...safeLocal.loads },
    loadHistory: [...history.values()],
  };
}

function currentDayIndex() {
  const day = new Date().getDay();
  return day === 0 ? 6 : day - 1;
}

function getWeekStart(date = new Date()) {
  const result = new Date(date);
  const day = (result.getDay() + 6) % 7;
  result.setDate(result.getDate() - day);
  result.setHours(0, 0, 0, 0);
  return result;
}

function calculateStreak(logs: LogEntry[]) {
  const active = new Set(logs.filter(l => l.sessionDone || l.activeMinutes > 0).map(l => l.date));
  let streak = 0;
  const cursor = new Date();
  if (!active.has(today())) cursor.setDate(cursor.getDate() - 1);
  while (active.has(cursor.toLocaleDateString("en-CA"))) {
    streak++;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}

function WeightChart({ logs }: { logs: LogEntry[] }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const weights = logs.filter(l => l.weight).slice(-12);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || weights.length === 0) return;
    const draw = () => {
      const rect = canvas.getBoundingClientRect();
      const ratio = window.devicePixelRatio || 1;
      canvas.width = rect.width * ratio;
      canvas.height = rect.height * ratio;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      ctx.scale(ratio, ratio);
      const width = rect.width, height = rect.height;
      const pad = { x: 34, y: 30 };
      const values = weights.map(l => l.weight as number);
      const min = Math.min(...values) - 1;
      const max = Math.max(...values) + 1;
      const x = (i: number) => pad.x + (weights.length === 1 ? (width - pad.x * 2) / 2 : i * (width - pad.x * 2) / (weights.length - 1));
      const y = (v: number) => pad.y + (max - v) * (height - pad.y * 2) / Math.max(1, max - min);
      ctx.clearRect(0, 0, width, height);
      ctx.strokeStyle = "rgba(74, 91, 119, .13)";
      ctx.lineWidth = 1;
      for (let i = 0; i < 4; i++) {
        const lineY = pad.y + i * (height - pad.y * 2) / 3;
        ctx.beginPath(); ctx.moveTo(pad.x, lineY); ctx.lineTo(width - pad.x, lineY); ctx.stroke();
      }
      ctx.strokeStyle = "#3569ee";
      ctx.lineWidth = 4;
      ctx.lineCap = "round"; ctx.lineJoin = "round";
      ctx.beginPath();
      weights.forEach((entry, i) => i ? ctx.lineTo(x(i), y(entry.weight as number)) : ctx.moveTo(x(i), y(entry.weight as number)));
      ctx.stroke();
      weights.forEach((entry, i) => {
        ctx.fillStyle = "#e3e8ef"; ctx.beginPath(); ctx.arc(x(i), y(entry.weight as number), 7, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = "#3569ee"; ctx.lineWidth = 3; ctx.stroke();
      });
    };
    draw();
    const observer = new ResizeObserver(draw);
    observer.observe(canvas);
    return () => observer.disconnect();
  }, [weights]);

  if (!weights.length) return <div className="empty-chart"><span>↗</span><p>Registra tu peso para ver la evolución.</p></div>;
  return <canvas ref={canvasRef} className="weight-chart" aria-label="Gráfico de evolución del peso" />;
}

function App() {
  const [store, setStore] = useState<Store>(loadStore);
  const [theme, setTheme] = useState<Theme>(loadTheme);
  const [view, setView] = useState<View>("hoy");
  const [selectedDay, setSelectedDay] = useState(currentDayIndex);
  const [timer, setTimer] = useState(90);
  const [timerRunning, setTimerRunning] = useState(false);
  const [form, setForm] = useState({ date: today(), weight: "", systolic: "", diastolic: "", activeMinutes: "", steps: "", water: "", energy: "3", note: "" });
  const [sessionForm, setSessionForm] = useState({ weight: "", systolic: "", diastolic: "", activeMinutes: "", note: "" });
  const [saveMessage, setSaveMessage] = useState("");
  const [cloudUser, setCloudUser] = useState<CloudUser | null>(null);
  const [authChecked, setAuthChecked] = useState(!supabase);
  const [cloudReady, setCloudReady] = useState(false);
  const [syncStatus, setSyncStatus] = useState<"local" | "syncing" | "synced" | "error">("local");
  const [authOpen, setAuthOpen] = useState(false);
  const [authEmail, setAuthEmail] = useState("");
  const [authPassword, setAuthPassword] = useState("");
  const [authBusy, setAuthBusy] = useState(false);
  const [authMessage, setAuthMessage] = useState("");
  const [selectedGuide, setSelectedGuide] = useState<GuideSelection | null>(null);
  const importRef = useRef<HTMLInputElement>(null);
  const guideModalRef = useRef<HTMLElement>(null);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    localStorage.setItem(THEME_KEY, theme);
    document.querySelector('meta[name="theme-color"]')?.setAttribute("content", theme === "dark" ? "#202733" : "#e3e8ef");
  }, [theme]);
  useEffect(() => {
    if (!selectedGuide) return;
    const previousOverflow = document.body.style.overflow;
    const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setSelectedGuide(null);
      if (event.key !== "Tab" || !guideModalRef.current) return;
      const focusable = [...guideModalRef.current.querySelectorAll<HTMLElement>("button, a[href]")]
        .filter(element => !element.hasAttribute("disabled"));
      const first = focusable[0];
      const last = focusable.at(-1);
      if (!first || !last) return;
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", closeOnEscape);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", closeOnEscape);
      previousFocus?.focus();
    };
  }, [selectedGuide]);

  useEffect(() => {
    if (!authChecked) return;
    localStorage.setItem(STORE_KEY, JSON.stringify(store));
    if (cloudUser) localStorage.setItem(STORE_OWNER_KEY, cloudUser.id);
  }, [store, cloudUser?.id, authChecked]);
  useEffect(() => {
    if (!supabase) return;
    const applySession = (user: CloudUser | null) => {
      const storedOwner = localStorage.getItem(STORE_OWNER_KEY);
      if (!user && storedOwner) {
        localStorage.removeItem(STORE_KEY);
        localStorage.removeItem(STORE_OWNER_KEY);
        setStore({ ...initialStore });
      } else if (user && storedOwner && storedOwner !== user.id) {
        localStorage.removeItem(STORE_KEY);
        setStore({ ...initialStore });
      }
      setCloudUser(user);
      setAuthChecked(true);
      if (!user) {
        setCloudReady(false);
        setSyncStatus("local");
      }
    };
    supabase.auth.getSession()
      .then(({ data }) => applySession(data.session?.user || null))
      .catch(() => applySession(null));
    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      applySession(session?.user || null);
      if (!session?.user) {
        setCloudReady(false);
        setSyncStatus("local");
      }
    });
    return () => data.subscription.unsubscribe();
  }, []);
  useEffect(() => {
    if (!cloudUser) return;
    let cancelled = false;
    setCloudReady(false);
    setSyncStatus("syncing");
    readCloudStore()
      .then(remote => {
        if (cancelled) return;
        setStore(current => mergeStores(current, remote as Partial<Store> | null));
        setCloudReady(true);
        setSyncStatus("synced");
      })
      .catch(() => {
        if (!cancelled) setSyncStatus("error");
      });
    return () => { cancelled = true; };
  }, [cloudUser?.id]);
  useEffect(() => {
    if (!cloudUser || !cloudReady) return;
    setSyncStatus("syncing");
    const timeout = window.setTimeout(() => {
      writeCloudStore(store)
        .then(() => setSyncStatus("synced"))
        .catch(() => setSyncStatus("error"));
    }, 700);
    return () => window.clearTimeout(timeout);
  }, [store, cloudUser?.id, cloudReady]);
  useEffect(() => {
    if (!timerRunning) return;
    const id = window.setInterval(() => setTimer(value => {
      if (value <= 1) { setTimerRunning(false); return 0; }
      return value - 1;
    }), 1000);
    return () => window.clearInterval(id);
  }, [timerRunning]);

  const sortedLogs = [...store.logs].sort((a, b) => a.date.localeCompare(b.date));
  const weightLogs = sortedLogs.filter(l => l.weight);
  const firstWeight = weightLogs[0]?.weight;
  const currentWeight = weightLogs.at(-1)?.weight;
  const weightChange = firstWeight && currentWeight ? currentWeight - firstWeight : 0;
  const totalSessions = store.logs.filter(l => l.sessionDone).length;
  const totalMinutes = store.logs.reduce((sum, l) => sum + (l.activeMinutes || 0), 0);
  const streak = calculateStreak(store.logs);
  const weekStart = getWeekStart();
  const weekLogs = store.logs.filter(l => new Date(`${l.date}T12:00:00`) >= weekStart);
  const weekGym = weekLogs.filter(l => l.sessionDone && (l.session === "lunes" || l.session === "miercoles")).length;
  const weekWalks = weekLogs.filter(l => l.activeMinutes > 0 && (l.session === "caminar" || !l.session)).length;
  const weekMinutes = weekLogs.reduce((sum, l) => sum + l.activeMinutes, 0);
  const qualifiedGym = store.logs.filter(l => l.sessionDone && (l.session === "lunes" || l.session === "miercoles") && l.activeMinutes >= 60).length;
  const qualifiedKettlebell = store.logs.filter(l => l.sessionDone && l.session === "viernes" && l.activeMinutes >= 25).length;
  const walks15 = store.logs.filter(l => l.session === "caminar" && l.activeMinutes >= 15).length;
  const walks20 = store.logs.filter(l => l.session === "caminar" && l.activeMinutes >= 20).length;
  const walks25 = store.logs.filter(l => l.session === "caminar" && l.activeMinutes >= 25).length;
  let programLevel = 1;
  if (qualifiedGym >= 2 && qualifiedKettlebell >= 1 && walks15 >= 2) programLevel = 2;
  if (qualifiedGym >= 6 && qualifiedKettlebell >= 3 && walks20 >= 6) programLevel = 3;
  if (qualifiedGym >= 10 && qualifiedKettlebell >= 5 && walks25 >= 8 && totalMinutes >= 750) programLevel = 4;
  const walkTarget = [15, 20, 25, 30][programLevel - 1];
  const walkTargetCount = programLevel === 1 ? 2 : 3;
  const requirements = programLevel === 1
    ? [{ label: "Gym · 60 min", value: qualifiedGym, target: 2 }, { label: "Kettlebell · 25 min", value: qualifiedKettlebell, target: 1 }, { label: "Caminatas · 15 min", value: walks15, target: 2 }]
    : programLevel === 2
      ? [{ label: "Gym acumulado", value: qualifiedGym, target: 6 }, { label: "Kettlebell acumulado", value: qualifiedKettlebell, target: 3 }, { label: "Caminatas · 20 min", value: walks20, target: 6 }]
      : programLevel === 3
        ? [{ label: "Gym acumulado", value: qualifiedGym, target: 10 }, { label: "Kettlebell acumulado", value: qualifiedKettlebell, target: 5 }, { label: "Caminatas · 25 min", value: walks25, target: 8 }, { label: "Minutos totales", value: totalMinutes, target: 750 }]
        : [];
  const unlockProgress = requirements.length
    ? Math.round(requirements.reduce((sum, item) => sum + Math.min(1, item.value / item.target), 0) / requirements.length * 100)
    : 100;
  const activeSchedule = weeklySchedule.map((day, index) =>
    index === 3 && programLevel >= 2
      ? { ...day, key: "caminar" as SessionKey, detail: "Caminata +" }
      : day
  );
  const sessionKey = activeSchedule[selectedDay].key;
  const baseSession = sessions[sessionKey];
  const session = {
    ...baseSession,
    duration: sessionKey === "caminar" ? walkTarget : baseSession.duration,
    blocks: sessionKey === "caminar"
      ? [{ time: `${walkTarget} MIN`, title: `Objetivo del Nivel ${programLevel}`, exercises: [
          { name: "Caminata a ritmo conversable", prescription: `${walkTarget} min`, note: "Debes poder hablar en frases completas." },
          { name: "Vuelta a la calma", prescription: "3 min suaves", note: "No te detengas de golpe." },
        ]}]
      : baseSession.blocks.map(block => ({
          ...block,
          title: sessionKey === "viernes" && block.title.startsWith("Circuito")
            ? `Circuito · ${programLevel >= 3 ? 3 : 2} vueltas`
            : block.title,
          exercises: block.exercises.map(exercise => ({
            ...exercise,
            prescription: programLevel >= 3 && (sessionKey === "lunes" || sessionKey === "miercoles")
              ? exercise.prescription.replace(/^2 ×/, "3 ×")
              : exercise.prescription,
          })),
        })),
  };
  const allExercises = session.blocks.flatMap((block, bi) => block.exercises.map((exercise, ei) => ({ ...exercise, id: `${today()}-${sessionKey}-${bi}-${ei}` })));
  const doneCount = allExercises.filter(e => store.checks[e.id]).length;
  const donePercent = Math.round(doneCount / allExercises.length * 100);
  const lastSevenDays = Array.from({ length: 7 }, (_, index) => {
    const date = new Date();
    date.setDate(date.getDate() - (6 - index));
    const key = date.toLocaleDateString("en-CA");
    const entry = store.logs.find(log => log.date === key);
    return {
      key,
      label: new Intl.DateTimeFormat("es-CL", { weekday: "short" }).format(date).slice(0, 2),
      minutes: entry?.activeMinutes || 0,
    };
  });

  const achievements = useMemo(() => [
    { icon: "●", title: "Primer paso", text: "Completa tu primera sesión", earned: totalSessions >= 1 },
    { icon: "III", title: "Racha de tres", text: "Muévete tres días seguidos", earned: streak >= 3 },
    { icon: "−1", title: "Primer kilo", text: "Baja el primer kilo de la tendencia", earned: weightChange <= -1 },
    { icon: "05", title: "Cinco sesiones", text: "Acumula cinco entrenamientos", earned: totalSessions >= 5 },
    { icon: "♥", title: "Presión al día", text: "Registra cinco lecturas", earned: store.logs.filter(l => l.systolic && l.diastolic).length >= 5 },
    { icon: "150", title: "Semana activa", text: "Alcanza 150 minutos semanales", earned: weekMinutes >= 150 },
  ], [store.logs, totalSessions, streak, weightChange, weekMinutes]);

  function toggleExercise(id: string) {
    setStore(current => ({ ...current, checks: { ...current.checks, [id]: !current.checks[id] } }));
  }

  function adjustLoad(exercise: Exercise, direction: -1 | 1) {
    if (!exercise.load || exercise.load.fixed) return;
    setStore(current => {
      const existing = current.loads[exercise.name];
      const currentKg = existing?.kg ?? exercise.load!.initial;
      const nextKg = Math.max(0, currentKg + direction * exercise.load!.step);
      const progress: LoadProgress = {
        kg: nextKg,
        initialKg: existing?.initialKg ?? currentKg,
        comfortableDates: [],
      };
      return {
        ...current,
        loads: { ...current.loads, [exercise.name]: progress },
        loadHistory: [
          ...current.loadHistory,
          ...(!existing ? [{ date: today(), name: exercise.name, kg: currentKg }] : []),
          { date: today(), name: exercise.name, kg: nextKg },
        ],
      };
    });
  }

  function markLoadComfortable(exercise: Exercise) {
    if (!exercise.load || exercise.load.fixed) return;
    const previous = store.loads[exercise.name];
    const currentKg = previous?.kg ?? exercise.load.initial;
    if (previous?.comfortableDates.includes(today())) {
      setSaveMessage("Esta carga ya fue validada hoy.");
      window.setTimeout(() => setSaveMessage(""), 2500);
      return;
    }
    const dates = [...(previous?.comfortableDates || []), today()];
    const unlock = dates.length >= 2;
    const nextKg = unlock ? currentKg + exercise.load.step : currentKg;
    setStore(current => ({
      ...current,
      loads: {
        ...current.loads,
        [exercise.name]: {
          kg: nextKg,
          initialKg: previous?.initialKg ?? currentKg,
          comfortableDates: unlock ? [] : dates,
        },
      },
      loadHistory: unlock
        ? [...current.loadHistory, { date: today(), name: exercise.name, kg: nextKg }]
        : previous
          ? current.loadHistory
          : [...current.loadHistory, { date: today(), name: exercise.name, kg: currentKg }],
    }));
    setSaveMessage(unlock
      ? `Nueva carga desbloqueada: ${exercise.name}, ${nextKg} kg.`
      : `${exercise.name}: 1 de 2 sesiones controladas.`);
    window.setTimeout(() => setSaveMessage(""), 3200);
  }

  async function submitAuth(mode: "signin" | "signup") {
    const email = authEmail.trim().toLowerCase();
    if (!supabase || !email || !authPassword) {
      setAuthMessage("Ingresa tu correo y contraseña.");
      return;
    }
    if (mode === "signup" && authPassword.length < 12) {
      setAuthMessage("Para crear la cuenta usa al menos 12 caracteres.");
      return;
    }
    if (mode === "signup" &&
        (!/[a-z]/.test(authPassword) || !/[A-Z]/.test(authPassword) ||
         !/\d/.test(authPassword) || !/[^A-Za-z0-9]/.test(authPassword))) {
      setAuthMessage("Incluye minúscula, mayúscula, número y símbolo.");
      return;
    }
    setAuthBusy(true);
    setAuthMessage("");
    try {
      const result = mode === "signin"
        ? await supabase.auth.signInWithPassword({ email, password: authPassword })
        : await supabase.auth.signUp({
            email,
            password: authPassword,
            options: { emailRedirectTo: "https://geoidegeoidal.github.io/ruta-fuerte/" },
          });
      if (result.error) {
        setAuthMessage(
          result.error.status === 429
            ? "Demasiados intentos. Espera unos minutos antes de volver a probar."
            : mode === "signin"
              ? "No pudimos iniciar sesión. Revisa tus datos o confirma tu correo."
              : "No pudimos crear la cuenta. Prueba otro correo o una contraseña más fuerte."
        );
        return;
      }
      if (mode === "signup" && !result.data.session) {
        setAuthMessage("Revisa tu correo para confirmar la cuenta y luego inicia sesión.");
      } else {
        setAuthMessage("Cuenta conectada. Sincronizando tus datos…");
        window.setTimeout(() => setAuthOpen(false), 900);
      }
    } catch {
      setAuthMessage("No pudimos conectar con la nube. Revisa tu conexión e intenta otra vez.");
    } finally {
      setAuthBusy(false);
    }
  }

  async function startGoogleSignIn() {
    setAuthBusy(true);
    setAuthMessage("");
    try {
      await signInWithGoogle();
    } catch {
      setAuthMessage("No pudimos iniciar con Google. Inténtalo nuevamente.");
      setAuthBusy(false);
    }
  }

  async function signOutSecurely() {
    try {
      const { error } = await supabase!.auth.signOut();
      if (error) {
        setAuthMessage("No se pudo cerrar la sesión. Revisa tu conexión e intenta nuevamente.");
        return;
      }
      localStorage.removeItem(STORE_KEY);
      localStorage.removeItem(STORE_OWNER_KEY);
      setStore({ ...initialStore });
      setAuthPassword("");
      setAuthOpen(false);
    } catch {
      setAuthMessage("No se pudo cerrar la sesión. Revisa tu conexión e intenta nuevamente.");
    }
  }

  function mergeLog(entry: LogEntry) {
    setStore(current => {
      const existing = current.logs.find(l => l.date === entry.date);
      const logs = existing
        ? current.logs.map(l => l.date === entry.date ? { ...l, ...entry, id: l.id } : l)
        : [...current.logs, entry];
      return { ...current, logs };
    });
  }

  function finishSession(event: React.FormEvent) {
    event.preventDefault();
    const numericFields = [
      ["Peso", sessionForm.weight, 30, 400],
      ["Presión sistólica", sessionForm.systolic, 60, 260],
      ["Presión diastólica", sessionForm.diastolic, 30, 160],
      ["Minutos realizados", sessionForm.activeMinutes, 1, 1440],
    ] as const;
    const invalid = numericFields.find(([, value, min, max]) => {
      if (!value) return false;
      const parsed = Number(value.replace(",", "."));
      return !Number.isFinite(parsed) || parsed < min || parsed > max;
    });
    if (invalid) {
      setSaveMessage(`${invalid[0]} está fuera del rango permitido.`);
      window.setTimeout(() => setSaveMessage(""), 3200);
      return;
    }
    if (Boolean(sessionForm.systolic) !== Boolean(sessionForm.diastolic)) {
      setSaveMessage("Si registras la presión, completa ambos valores.");
      window.setTimeout(() => setSaveMessage(""), 3200);
      return;
    }
    const existing = store.logs.find(log => log.date === today());
    mergeLog({
      id: existing?.id || crypto.randomUUID(),
      date: today(),
      activeMinutes: sessionForm.activeMinutes ? Number(sessionForm.activeMinutes) : Math.max(existing?.activeMinutes || 0, session.duration),
      weight: sessionForm.weight ? Number(sessionForm.weight.replace(",", ".")) : existing?.weight,
      systolic: sessionForm.systolic ? Number(sessionForm.systolic) : existing?.systolic,
      diastolic: sessionForm.diastolic ? Number(sessionForm.diastolic) : existing?.diastolic,
      steps: existing?.steps,
      water: existing?.water,
      energy: existing?.energy,
      note: sessionForm.note.slice(0, MAX_NOTE_LENGTH) || existing?.note,
      session: sessionKey, sessionDone: true,
    });
    setSessionForm({ weight: "", systolic: "", diastolic: "", activeMinutes: "", note: "" });
    setSaveMessage(programLevel < 4 ? "Sesión guardada. Tu próximo nivel está más cerca." : "Sesión guardada. Nivel máximo consolidado.");
    window.setTimeout(() => setSaveMessage(""), 3000);
  }

  function saveDailyLog(event: React.FormEvent) {
    event.preventDefault();
    const numericFields = [
      ["Peso", form.weight, 30, 400],
      ["Presión sistólica", form.systolic, 60, 260],
      ["Presión diastólica", form.diastolic, 30, 160],
      ["Minutos activos", form.activeMinutes, 0, 1440],
      ["Pasos", form.steps, 0, 100000],
      ["Vasos de agua", form.water, 0, 50],
    ] as const;
    const invalid = numericFields.find(([, value, min, max]) => {
      if (!value) return false;
      const parsed = Number(value.replace(",", "."));
      return !Number.isFinite(parsed) || parsed < min || parsed > max;
    });
    if (!isDate(form.date) || invalid) {
      setSaveMessage(invalid ? `${invalid[0]} está fuera del rango permitido.` : "La fecha no es válida.");
      window.setTimeout(() => setSaveMessage(""), 3200);
      return;
    }
    const existing = store.logs.find(l => l.date === form.date);
    mergeLog({
      id: existing?.id || crypto.randomUUID(),
      date: form.date,
      weight: form.weight ? Number(form.weight.replace(",", ".")) : existing?.weight,
      systolic: form.systolic ? Number(form.systolic) : existing?.systolic,
      diastolic: form.diastolic ? Number(form.diastolic) : existing?.diastolic,
      activeMinutes: form.activeMinutes ? Number(form.activeMinutes) : existing?.activeMinutes || 0,
      steps: form.steps ? Number(form.steps) : existing?.steps,
      water: form.water ? Number(form.water) : existing?.water,
      energy: Number(form.energy),
      note: form.note.slice(0, MAX_NOTE_LENGTH) || existing?.note,
      session: existing?.session,
      sessionDone: existing?.sessionDone,
    });
    setForm(current => ({ ...current, weight: "", systolic: "", diastolic: "", activeMinutes: "", steps: "", water: "", note: "" }));
    setSaveMessage("Registro diario guardado.");
    window.setTimeout(() => setSaveMessage(""), 3000);
  }

  function exportData() {
    const blob = new Blob([JSON.stringify(store, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url; anchor.download = `ruta-fuerte-respaldo-${today()}.json`; anchor.click();
    URL.revokeObjectURL(url);
  }

  function importData(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    if (file.size > MAX_BACKUP_BYTES) {
      setSaveMessage("El respaldo supera el límite seguro de 1 MB.");
      event.target.value = "";
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(String(reader.result));
        if (!isRecord(parsed) || !Array.isArray(parsed.logs) || !isRecord(parsed.checks)) throw new Error();
        setStore(mergeStores(initialStore, normalizeStore(parsed)));
        setSaveMessage("Respaldo importado correctamente.");
      } catch { setSaveMessage("Ese archivo no es un respaldo válido."); }
      event.target.value = "";
    };
    reader.onerror = () => setSaveMessage("No se pudo leer el respaldo.");
    reader.readAsText(file);
  }

  const themeToggle = (
    <button
      className="theme-toggle"
      type="button"
      aria-label={theme === "dark" ? "Cambiar a modo claro" : "Cambiar a modo noche"}
      aria-pressed={theme === "dark"}
      onClick={() => setTheme(current => current === "dark" ? "light" : "dark")}
    >
      <span aria-hidden="true">{theme === "dark" ? "☾" : "☀"}</span>
    </button>
  );

  const authForm = !cloudConfigured
    ? <div className="auth-message error">La sincronización todavía no está configurada en esta versión.</div>
    : <div className="auth-form">
        {googleAuthEnabled && <>
          <button className="google-action" type="button" disabled={authBusy} onClick={startGoogleSignIn}>
            <span aria-hidden="true">G</span> CONTINUAR CON GOOGLE
          </button>
          <div className="auth-divider"><span>o usa tu correo</span></div>
        </>}
        <label>Correo<input type="email" inputMode="email" autoComplete="email" maxLength={254} spellCheck={false} value={authEmail} onChange={event => setAuthEmail(event.target.value)} placeholder="tu@correo.cl" /></label>
        <label>Contraseña<input type="password" autoComplete="current-password" minLength={12} maxLength={128} spellCheck={false} value={authPassword} onChange={event => setAuthPassword(event.target.value)} placeholder="12+ · Aa1!" /></label>
        {authMessage && <div className="auth-message" role="status">{authMessage}</div>}
        <button className="primary full" type="button" disabled={authBusy} onClick={() => submitAuth("signin")}>{authBusy ? "CONECTANDO…" : "INICIAR SESIÓN"}</button>
        <button className="secondary-action" type="button" disabled={authBusy} onClick={() => submitAuth("signup")}>CREAR CUENTA</button>
      </div>;

  if (!authChecked) {
    return <main className="security-loading" aria-live="polite"><div className="cloud-orb">RF</div><strong>Protegiendo tus datos…</strong></main>;
  }

  if (!cloudUser) {
    return (
      <main className="auth-gate">
        <div className="auth-gate-theme">{themeToggle}</div>
        <section className="auth-gate-card" aria-labelledby="welcome-auth-title">
          <div className="auth-gate-story">
            <button className="logo auth-logo" type="button" aria-label="Ruta Fuerte"><span>RF</span><strong>Ruta Fuerte</strong></button>
            <div>
              <p className="eyebrow">Tu ruta, siempre contigo</p>
              <h1>Avanza.<br />Registra.<br /><em>Desbloquea.</em></h1>
              <p>Tu progreso queda protegido y sincronizado para continuar desde el celular o el computador.</p>
            </div>
            <ul className="auth-benefits">
              <li><i>✓</i><span><strong>Sesión recordada</strong>Entras una vez en este equipo.</span></li>
              <li><i>↻</i><span><strong>Sincronización privada</strong>Tus registros viajan contigo.</span></li>
              <li><i>↑</i><span><strong>Progreso acumulado</strong>Cargas, logros y evolución.</span></li>
            </ul>
          </div>
          <div className="auth-gate-panel">
            <div className="cloud-orb">☁</div>
            <p className="eyebrow">Primera visita</p>
            <h2 id="welcome-auth-title">Entra o crea tu cuenta.</h2>
            <p>Después recordaremos tu sesión en este equipo. Si cierras sesión, borraremos la copia local de tus datos.</p>
            {authForm}
            <small className="privacy-copy">Cada cuenta solo puede leer y modificar sus propios registros.</small>
            <footer className="legal-links"><a href="./privacy.html">Privacidad</a><a href="./terms.html">Términos</a></footer>
          </div>
        </section>
      </main>
    );
  }

  const nav: { key: View; label: string; icon: string }[] = [
    { key: "hoy", label: "Hoy", icon: "⌂" },
    { key: "historial", label: "Historial", icon: "≡" },
    { key: "evolucion", label: "Evolución", icon: "↗" },
    { key: "logros", label: "Mis logros", icon: "★" },
    { key: "plan", label: "Plan completo", icon: "▦" },
  ];

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand-row"><button className="logo" onClick={() => setView("hoy")} aria-label="Ruta Fuerte, inicio"><span>RF</span><strong>Ruta Fuerte</strong></button>{themeToggle}</div>
        <nav aria-label="Secciones">
          {nav.map(item => <button key={item.key} className={view === item.key ? "active" : ""} onClick={() => setView(item.key)}>
            <i>{item.icon}</i><span>{item.label}</span>
          </button>)}
        </nav>
        <div className="sidebar-goal">
          <span>Primera meta</span><strong>104,5 <small>kg</small></strong>
          <div className="mini-progress"><i style={{ width: `${Math.max(4, Math.min(100, Math.abs(weightChange) / 5.5 * 100))}%` }} /></div>
          <p>{Math.abs(weightChange).toFixed(1)} de 5,5 kg</p>
        </div>
        <button className={`cloud-status ${syncStatus}`} onClick={() => setAuthOpen(true)}>
          <i>{cloudUser ? "☁" : "↥"}</i>
          <span><strong>{cloudUser ? (syncStatus === "syncing" ? "Sincronizando…" : syncStatus === "error" ? "Error de sincronización" : "Datos sincronizados") : "Conectar mis datos"}</strong><small>{cloudUser?.email || "Celular + computador"}</small></span>
        </button>
      </aside>

      <main className="content">
        <header className="mobile-header">
          <button className="logo" onClick={() => setView("hoy")}><span>RF</span><strong>Ruta Fuerte</strong></button>
          <div className="mobile-tools"><div className="streak-pill">◉ {streak} días</div>{themeToggle}<button className={`mobile-cloud ${syncStatus}`} onClick={() => setAuthOpen(true)} aria-label="Datos sincronizados">☁</button></div>
        </header>

        {view === "hoy" && <div className="view">
          <section className="welcome">
            <div><p className="eyebrow">{dateLabel(today(), true)}</p><h1>Vamos paso<br />a paso.</h1><p>Hoy no necesitas motivación perfecta. Solo empezar.</p></div>
            <div className="goal-orbit"><span>PRIMERA META</span><strong>−5,5</strong><small>KG</small></div>
          </section>

          <section className="stats-grid" aria-label="Resumen">
            <article className="soft-card stat"><span className="stat-icon blue">↘</span><div><small>Peso actual</small><strong>{currentWeight ? currentWeight.toFixed(1) : "—"} <i>kg</i></strong><p>{weightLogs.length ? `${weightChange.toFixed(1)} kg desde el inicio` : "Registra tu punto de partida"}</p></div></article>
            <article className="soft-card stat"><span className="stat-icon coral">◉</span><div><small>Racha activa</small><strong>{streak} <i>días</i></strong><p>{streak ? "Sigue construyendo el hábito" : "Hoy puede ser el día uno"}</p></div></article>
            <article className="soft-card stat"><span className="stat-icon green">✓</span><div><small>Sesiones</small><strong>{totalSessions}</strong><p>{totalMinutes} minutos acumulados</p></div></article>
          </section>

          <section className="today-grid">
            <article className="soft-card workout-card">
              <div className="card-heading">
                <div><p className="eyebrow">{selectedDay === currentDayIndex() ? "Tu entrenamiento de hoy" : `Plan para el ${activeSchedule[selectedDay].day.toLowerCase()}`}</p><h2>{activeSchedule[selectedDay].day} · {session.title}</h2><span>{session.place} · {session.duration} min</span></div>
                <div className="completion-ring" style={{ "--progress": `${donePercent * 3.6}deg` } as React.CSSProperties}><strong>{donePercent}%</strong></div>
              </div>
              <div className="week-selector" role="tablist" aria-label="Elegir día de la semana">
                {activeSchedule.map((day, index) => <button
                  role="tab"
                  aria-selected={selectedDay === index}
                  className={`${selectedDay === index ? "active" : ""} ${currentDayIndex() === index ? "is-today" : ""}`}
                  onClick={() => setSelectedDay(index)}
                  key={day.day}
                >
                  <span>{day.short}</span><strong>{day.detail}</strong>{currentDayIndex() === index && <small>HOY</small>}
                </button>)}
              </div>
              <section className="unlock-panel" aria-label={`Progresión: nivel ${programLevel}`}>
                <div className="level-orb"><small>NIVEL</small><strong>{programLevel}</strong><span>DE 4</span></div>
                <div className="unlock-copy">
                  <div><p className="eyebrow">{programLevel === 4 ? "Todo desbloqueado" : `Camino al Nivel ${programLevel + 1}`}</p><h3>{["Base segura", "Más resistencia", "Más volumen", "Hábito consolidado"][programLevel - 1]}</h3></div>
                  {programLevel < 4 ? <>
                    <div className="unlock-progress"><i style={{width:`${unlockProgress}%`}}/><span>{unlockProgress}%</span></div>
                    <div className="unlock-requirements">
                      {requirements.map(item => <span className={item.value >= item.target ? "complete" : ""} key={item.label}><i>{item.value >= item.target ? "✓" : "○"}</i>{item.label}<b>{Math.min(item.value,item.target)}/{item.target}</b></span>)}
                    </div>
                    <p className="unlock-reward">Al desbloquear: {programLevel === 1 ? "caminatas de 20 min y tercer día activo opcional." : programLevel === 2 ? "3 series, 3 vueltas de kettlebell y caminatas de 25 min." : "caminatas de 30 min y meta consolidada de 150 min semanales."}</p>
                  </> : <p className="unlock-reward">Ya liberaste todo el plan. Mantén este nivel y prioriza la regularidad.</p>}
                </div>
              </section>
              <div className="exercise-list">
                {session.blocks.map((block, bi) => <div className="exercise-block" key={block.title}>
                  <div className="block-label"><span>{block.time}</span><strong>{block.title}</strong></div>
                  {block.exercises.map((exercise, ei) => {
                    const id = `${today()}-${sessionKey}-${bi}-${ei}`;
                    const loadState = store.loads[exercise.name];
                    const currentKg = loadState?.kg ?? exercise.load?.initial;
                    const validatedToday = loadState?.comfortableDates.includes(today());
                    const guide = exerciseGuides[exercise.name];
                    return <div className="exercise-shell" key={exercise.name}>
                      <div className="exercise-row">
                        <button className={`exercise ${store.checks[id] ? "done" : ""}`} onClick={() => toggleExercise(id)} aria-pressed={Boolean(store.checks[id])}>
                          <i>{store.checks[id] ? "✓" : ""}</i><span><strong>{exercise.name}</strong>{exercise.note && <small>{exercise.note}</small>}</span><b>{exercise.prescription}</b>
                        </button>
                        {guide && <button
                          className="guide-button"
                          type="button"
                          onClick={() => setSelectedGuide({ name: exercise.name, prescription: exercise.prescription, guide })}
                          aria-label={`Ver cómo hacer ${exercise.name}`}
                        ><i aria-hidden="true">◎</i><span>VER</span></button>}
                      </div>
                      {exercise.load && <div className={`load-control ${exercise.load.fixed ? "fixed" : ""}`}>
                        <span className="load-title"><small>CARGA</small><strong>{currentKg} <i>kg</i></strong></span>
                        {!exercise.load.fixed && <>
                          <div className="load-stepper">
                            <button onClick={() => adjustLoad(exercise, -1)} aria-label={`Bajar ${exercise.name} en ${exercise.load!.step} kilos`}>−</button>
                            <span>± {exercise.load.step} kg</span>
                            <button onClick={() => adjustLoad(exercise, 1)} aria-label={`Subir ${exercise.name} en ${exercise.load!.step} kilos`}>+</button>
                          </div>
                          <button className={`comfort-button ${validatedToday ? "checked" : ""}`} disabled={validatedToday} onClick={() => markLoadComfortable(exercise)}>
                            {validatedToday ? "✓ Validada hoy" : `Técnica controlada · ${loadState?.comfortableDates.length || 0}/2`}
                          </button>
                        </>}
                        {exercise.load.fixed && <span className="fixed-note">Kettlebell disponible · progresa con repeticiones y vueltas</span>}
                      </div>}
                    </div>;
                  })}
                </div>)}
              </div>
              {(sessionKey === "lunes" || sessionKey === "miercoles") && <div className="load-safety"><strong>Cómo subir los kilos:</strong> pulsa “Técnica controlada” únicamente si terminaste todas las series, podías hacer 3–4 repeticiones más, respiraste sin aguantar el aire y no hubo dolor, mareo ni falta de aire anormal. Después de dos días distintos, la app suma 5 kg. Ajusta el punto de partida con el instructor de MindFit si la máquina se siente demasiado fácil o difícil.</div>}
              <form className="session-completion" onSubmit={finishSession}>
                <details className="session-extra">
                  <summary>
                    <span><strong>Añadir datos opcionales</strong><small>Peso, presión, minutos reales o una nota</small></span>
                    <i aria-hidden="true">+</i>
                  </summary>
                  <div className="session-extra-body">
                    <p>Todos estos campos son opcionales. Si dejas los minutos vacíos, registraremos los {session.duration} min planificados.</p>
                    <div className="session-extra-grid">
                      <label>Peso
                        <span className="input-with-unit"><input name="session-weight" autoComplete="off" inputMode="decimal" placeholder="Ej. 110,0" value={sessionForm.weight} onChange={e => setSessionForm({...sessionForm, weight:e.target.value})}/><i>kg</i></span>
                      </label>
                      <label>Minutos realizados
                        <span className="input-with-unit"><input name="session-minutes" autoComplete="off" inputMode="numeric" placeholder={`Ej. ${session.duration}`} value={sessionForm.activeMinutes} onChange={e => setSessionForm({...sessionForm, activeMinutes:e.target.value})}/><i>min</i></span>
                      </label>
                      <label>Presión sistólica
                        <input name="session-systolic" autoComplete="off" inputMode="numeric" placeholder="Ej. 130" value={sessionForm.systolic} onChange={e => setSessionForm({...sessionForm, systolic:e.target.value})}/>
                      </label>
                      <label>Presión diastólica
                        <input name="session-diastolic" autoComplete="off" inputMode="numeric" placeholder="Ej. 85" value={sessionForm.diastolic} onChange={e => setSessionForm({...sessionForm, diastolic:e.target.value})}/>
                      </label>
                      <label className="session-note">Nota
                        <textarea name="session-note" autoComplete="off" maxLength={MAX_NOTE_LENGTH} placeholder="Ej. Me sentí con buena energía…" value={sessionForm.note} onChange={e => setSessionForm({...sessionForm, note:e.target.value})}/>
                      </label>
                    </div>
                    {(Number(sessionForm.systolic) > 180 || Number(sessionForm.diastolic) > 120) && <div className="bp-alert">No entrenes. Repite la medición y contacta a un profesional; con síntomas, busca atención urgente.</div>}
                  </div>
                </details>
                <div className="workout-actions">
                  <button className="primary" type="submit">COMPLETAR ENTRENAMIENTO</button>
                  <div className="timer"><span>Descanso</span><strong>{String(Math.floor(timer / 60)).padStart(2, "0")}:{String(timer % 60).padStart(2, "0")}</strong><button type="button" onClick={() => { if (timer === 0) setTimer(90); setTimerRunning(v => !v); }} aria-label={timerRunning ? "Pausar temporizador" : "Iniciar temporizador"}>{timerRunning ? "Ⅱ" : "▶"}</button><button type="button" onClick={() => { setTimerRunning(false); setTimer(90); }} aria-label="Reiniciar temporizador">↺</button></div>
                </div>
              </form>
            </article>

            <aside className="side-stack">
              <article className="soft-card week-card">
                <div className="card-heading compact"><div><p className="eyebrow">Esta semana</p><h3>Tu brecha</h3></div><strong>{Math.min(100, Math.round(weekMinutes / 150 * 100))}%</strong></div>
                <GapRow label="Gimnasio" value={weekGym} target={2} unit="sesiones" />
                <GapRow label="Caminatas" value={weekWalks} target={walkTargetCount} unit="salidas" />
                <GapRow label="Actividad" value={weekMinutes} target={150} unit="min" />
                <p className="gap-message">{weekMinutes >= 150 ? "Meta semanal conseguida. Excelente." : `Faltan ${Math.max(0, 150 - weekMinutes)} minutos. Cada caminata suma.`}</p>
              </article>
            </aside>
          </section>
        </div>}

        {view === "historial" && <div className="view">
          <PageTitle eyebrow="Tu bitácora" title="Historial diario" text="Registra lo suficiente para ver patrones. No necesitas perseguir números perfectos." />
          <section className="history-grid">
            <form className="soft-card full-log" onSubmit={saveDailyLog}>
              <p className="eyebrow">Para días sin entrenamiento</p>
              <h2>Registrar salud o actividad</h2>
              <p className="form-intro">Úsalo para una caminata, un día de descanso o para corregir una fecha anterior. Los entrenamientos se guardan desde “Hoy”.</p>
              <div className="form-grid">
                <label>Fecha<input type="date" value={form.date} onChange={e => setForm({...form,date:e.target.value})}/></label>
                <label>Peso<input inputMode="decimal" min="30" max="400" placeholder="kg" value={form.weight} onChange={e => setForm({...form,weight:e.target.value})}/></label>
                <label>Presión sistólica<input inputMode="numeric" min="60" max="260" placeholder="130" value={form.systolic} onChange={e => setForm({...form,systolic:e.target.value})}/></label>
                <label>Presión diastólica<input inputMode="numeric" min="30" max="160" placeholder="85" value={form.diastolic} onChange={e => setForm({...form,diastolic:e.target.value})}/></label>
                <label>Minutos activos<input inputMode="numeric" min="0" max="1440" placeholder="20" value={form.activeMinutes} onChange={e => setForm({...form,activeMinutes:e.target.value})}/></label>
                <label>Pasos<input inputMode="numeric" min="0" max="100000" placeholder="4500" value={form.steps} onChange={e => setForm({...form,steps:e.target.value})}/></label>
                <label>Vasos de agua<input inputMode="numeric" min="0" max="50" placeholder="6" value={form.water} onChange={e => setForm({...form,water:e.target.value})}/></label>
                <label>Energía<select value={form.energy} onChange={e => setForm({...form,energy:e.target.value})}><option value="1">1 · Muy baja</option><option value="2">2 · Baja</option><option value="3">3 · Normal</option><option value="4">4 · Buena</option><option value="5">5 · Excelente</option></select></label>
                <label className="wide">Nota<textarea maxLength={MAX_NOTE_LENGTH} placeholder="Sueño, molestias, cómo se sintió el entrenamiento…" value={form.note} onChange={e => setForm({...form,note:e.target.value})}/></label>
              </div>
              <button className="primary">GUARDAR EN HISTORIAL</button>
            </form>
            <div className="data-tools soft-card"><h3>Respaldo</h3><p>Si conectaste tu cuenta, la nube guarda una copia privada. También puedes descargar un respaldo personal.</p><button onClick={exportData}>↓ EXPORTAR DATOS</button><button onClick={() => importRef.current?.click()}>↑ IMPORTAR RESPALDO</button><input ref={importRef} type="file" accept="application/json,.json" hidden onChange={importData}/></div>
          </section>
          <section className="log-list">
            {[...store.logs].sort((a,b) => b.date.localeCompare(a.date)).map(log => <article className="soft-card log-row" key={log.id}>
              <div className="log-date"><strong>{new Date(`${log.date}T12:00:00`).getDate()}</strong><span>{dateLabel(log.date).split(" ")[1]}</span></div>
              <div className="log-main"><h3>{log.sessionDone ? `${sessions[log.session!].title} completado` : "Registro diario"}</h3><p>{log.note || "Sin nota para este día."}</p></div>
              <div className="log-metrics">{log.weight && <span><small>Peso</small>{log.weight} kg</span>}{log.systolic && <span><small>Presión</small>{log.systolic}/{log.diastolic}</span>}<span><small>Actividad</small>{log.activeMinutes} min</span></div>
            </article>)}
            {!store.logs.length && <div className="soft-card empty-state"><span>≡</span><h3>Tu historia comienza hoy</h3><p>Guarda el primer registro y aparecerá aquí.</p></div>}
          </section>
        </div>}

        {view === "evolucion" && <div className="view">
          <PageTitle eyebrow="Mira la tendencia" title="Tu evolución" text="El peso fluctúa. La dirección de varias semanas es lo que importa." />
          <section className="evolution-stats">
            <Metric label="Peso inicial" value={firstWeight ? `${firstWeight.toFixed(1)} kg` : "—"} detail={weightLogs[0] ? dateLabel(weightLogs[0].date) : "Sin datos"} />
            <Metric label="Peso actual" value={currentWeight ? `${currentWeight.toFixed(1)} kg` : "—"} detail={weightLogs.at(-1) ? dateLabel(weightLogs.at(-1)!.date) : "Sin datos"} />
            <Metric label="Cambio total" value={weightLogs.length ? `${weightChange > 0 ? "+" : ""}${weightChange.toFixed(1)} kg` : "—"} detail="Meta inicial: −5,5 kg" accent />
            <Metric label="IMC estimado" value={currentWeight ? (currentWeight / (1.65 * 1.65)).toFixed(1) : "—"} detail="Solo una referencia, no un juicio" />
          </section>
          <section className="soft-card chart-card"><div className="card-heading"><div><p className="eyebrow">Últimas 12 mediciones</p><h2>Evolución del peso</h2></div>{weightLogs.length > 1 && <span className={weightChange <= 0 ? "trend good" : "trend"}>{weightChange <= 0 ? "↘" : "↗"} {Math.abs(weightChange).toFixed(1)} kg</span>}</div><WeightChart logs={sortedLogs}/></section>
          <section className="soft-card activity-card">
            <div className="card-heading"><div><p className="eyebrow">Últimos siete días</p><h2>Minutos de actividad</h2></div><span className="week-total">{lastSevenDays.reduce((sum, day) => sum + day.minutes, 0)} min</span></div>
            <div className="activity-bars">
              {lastSevenDays.map(day => <div key={day.key}><span><i style={{height:`${Math.min(100, day.minutes / 60 * 100)}%`}}/><b>{day.minutes || ""}</b></span><small>{day.label}</small></div>)}
            </div>
            <p className="chart-caption">Cada columna muestra hasta 60 minutos. Los días en cero no son fracasos: son información para ajustar la semana.</p>
          </section>
          <section className="soft-card load-history-card">
            <div className="load-history-heading">
              <div><p className="eyebrow">Sobrecarga progresiva</p><h2>Evolución de cargas</h2><p>Compara tu punto de partida con la carga actual y revisa qué falta para liberar el siguiente aumento.</p></div>
              <div className="load-summary"><strong>{loadCatalog.filter(exercise => (store.loads[exercise.name]?.kg ?? exercise.load!.initial) > (store.loads[exercise.name]?.initialKg ?? exercise.load!.initial)).length}</strong><span>ejercicios<br/>con avance</span></div>
            </div>
            <div className="load-progress-list">
              {loadCatalog.map(exercise => {
                const progress = store.loads[exercise.name];
                const current = progress?.kg ?? exercise.load!.initial;
                const initial = progress?.initialKg ?? exercise.load!.initial;
                const increase = current - initial;
                const validations = progress?.comfortableDates.length || 0;
                const history = store.loadHistory
                  .filter(item => item.name === exercise.name)
                  .filter((item, index, entries) => index === 0 || item.kg !== entries[index - 1].kg)
                  .slice(-4);
                return <article className="load-progress-item" key={exercise.name}>
                  <div className="load-progress-top">
                    <div className="load-exercise-name">
                      <small>{exercise.load!.fixed ? "KETTLEBELL · CARGA FIJA" : "MÁQUINA · PROGRESIÓN POR TÉCNICA"}</small>
                      <h3>{exercise.name}</h3>
                    </div>
                    <span className={`load-delta ${increase > 0 ? "gain" : ""}`}>{increase > 0 ? `+${increase} kg` : "Carga base"}</span>
                  </div>
                  <div className="load-values" role="group" aria-label={`Carga inicial ${initial} kilos; carga actual ${current} kilos`}>
                    <span><small>INICIO</small><strong>{initial}<i> kg</i></strong></span>
                    <i className="load-arrow" aria-hidden="true">→</i>
                    <span className="current"><small>AHORA</small><strong>{current}<i> kg</i></strong></span>
                  </div>
                  {exercise.load!.fixed
                    ? <div className="fixed-load-path"><span aria-hidden="true">12</span><p><strong>El peso no cambia.</strong> Avanza sumando repeticiones o vueltas con técnica controlada.</p></div>
                    : <div className="validation-path">
                        <div><span role="progressbar" aria-label={`Validaciones técnicas de ${exercise.name}`} aria-valuemin={0} aria-valuemax={2} aria-valuenow={validations}><i style={{width:`${validations / 2 * 100}%`}}/></span><strong>{validations}/2 validaciones</strong></div>
                        <p>{validations === 1 ? `Una sesión técnica más libera ${current + exercise.load!.step} kg.` : `Valida 2 sesiones cómodas para liberar ${current + exercise.load!.step} kg.`}</p>
                      </div>}
                  <div className="load-trail">
                    <small>ÚLTIMOS CAMBIOS</small>
                    {history.length
                      ? <ol>{history.map((item, index) => <li key={`${item.date}-${item.kg}-${index}`}><strong>{item.kg} kg</strong><span>{new Intl.DateTimeFormat("es-CL", { day: "2-digit", month: "short" }).format(new Date(`${item.date}T12:00:00`))}</span></li>)}</ol>
                      : <p>Aún no hay cambios. Esta es tu carga inicial.</p>}
                  </div>
                </article>;
              })}
            </div>
            <p className="chart-caption">Las cargas de máquina son referencias editables. El mecanismo de cada máquina cambia cuánto esfuerzo representan realmente esos kilos.</p>
          </section>
          <section className="insights-grid">
            <article className="soft-card insight"><span>01</span><h3>Ritmo recomendado</h3><strong>0,25–0,75 kg</strong><p>por semana. Más rápido no siempre significa mejor ni más sostenible.</p></article>
            <article className="soft-card insight"><span>02</span><h3>Actividad acumulada</h3><strong>{totalMinutes} min</strong><p>{totalSessions} sesiones completas registradas.</p></article>
            <article className="soft-card insight"><span>03</span><h3>Siguiente hito</h3><strong>{currentWeight ? Math.max(0, currentWeight - 104.5).toFixed(1) : "5,5"} kg</strong><p>para llegar a tu primera meta de 104,5 kg.</p></article>
          </section>
        </div>}

        {view === "logros" && <div className="view">
          <PageTitle eyebrow="Evidencia de que avanzas" title="Mis logros" text="No todos los triunfos aparecen en la balanza. Aquí cuentan la constancia, la salud y el trabajo hecho." />
          <section className="achievement-summary soft-card"><div><span>LOGROS DESBLOQUEADOS</span><strong>{achievements.filter(a => a.earned).length}<small> / {achievements.length}</small></strong></div><div className="big-progress"><i style={{width:`${achievements.filter(a=>a.earned).length/achievements.length*100}%`}}/></div><p>{achievements.filter(a=>a.earned).length === achievements.length ? "Los desbloqueaste todos. Es hora de definir nuevos hitos." : "El próximo se construye con una decisión pequeña hoy."}</p></section>
          <section className="achievements-grid">{achievements.map(item => <article className={`soft-card achievement ${item.earned ? "earned" : ""}`} key={item.title}><span>{item.icon}</span><div><small>{item.earned ? "DESBLOQUEADO" : "AÚN BLOQUEADO"}</small><h3>{item.title}</h3><p>{item.text}</p></div>{item.earned && <i>✓</i>}</article>)}</section>
          <section className="soft-card milestones"><h2>Hitos del camino</h2><Milestone label="Punto de partida" value={firstWeight || 110} active /><Milestone label="Primera meta · −5%" value={104.5} active={Boolean(currentWeight && currentWeight <= 104.5)} /><Milestone label="Segunda meta · −10%" value={99} active={Boolean(currentWeight && currentWeight <= 99)} /><p>Las metas pueden ajustarse con tu equipo de salud. Llegar más lento sigue siendo llegar.</p></section>
        </div>}

        {view === "plan" && <div className="view">
          <PageTitle eyebrow="Tu mapa de ocho semanas" title="Plan completo" text="Dos días fuertes de gimnasio, una sesión corta en casa y caminatas que aumentan gradualmente." />
          <section className="profile-strip soft-card">
            <div><small>Estatura</small><strong>1,65 m</strong></div>
            <div><small>Punto de partida</small><strong>110 kg</strong></div>
            <div><small>Condición a cuidar</small><strong>Hipertensión</strong></div>
            <div><small>Equipo en casa</small><strong>Kettlebell · 12 kg</strong></div>
            <div><small>Contexto</small><strong>Trabajo sedentario</strong></div>
          </section>
          <section className="week-plan">
            {[["LUN","MindFit","Fuerza A · 60 min"],["MAR","Caminar","15–30 min"],["MIÉ","MindFit","Fuerza B · 60 min"],["JUE","Recuperar","Caminata suave"],["VIE","Casa","Kettlebell · 25 min"],["SÁB","Caminar","15–30 min"],["DOM","Descanso","Moverse suave"]].map((d,i)=><article className={`soft-card ${[0,2,4].includes(i)?"focus":""}`} key={d[0]}><span>{d[0]}</span><h3>{d[1]}</h3><p>{d[2]}</p></article>)}
          </section>
          <section className="plan-grid">
            <article className="soft-card plan-card"><p className="eyebrow">Progresión</p><h2>Subir sin apurarse</h2><div className="timeline">
              <div className="unlocked"><span>✓</span><strong>Nivel 1 · Adaptar</strong><p>2 gimnasios, 1 kettlebell y caminatas de 15 minutos.</p></div>
              <div className={programLevel >= 2 ? "unlocked" : "locked"}><span>{programLevel >= 2 ? "✓" : "🔒"}</span><strong>Nivel 2 · Construir</strong><p>Caminatas de 20 minutos y tercer día activo opcional.</p></div>
              <div className={programLevel >= 3 ? "unlocked" : "locked"}><span>{programLevel >= 3 ? "✓" : "🔒"}</span><strong>Nivel 3 · Consolidar</strong><p>3 series, 3 vueltas de kettlebell y caminatas de 25 minutos.</p></div>
              <div className={programLevel >= 4 ? "unlocked" : "locked"}><span>{programLevel >= 4 ? "✓" : "🔒"}</span><strong>Nivel 4 · Sostener</strong><p>Caminatas de 30 minutos y al menos 150 minutos semanales.</p></div>
            </div></article>
            <article className="soft-card plan-card"><p className="eyebrow">Alimentación</p><h2>Lo que mueve la balanza</h2><ul className="guideline-list"><li><span>½</span><div><strong>Verduras</strong><p>La mitad del plato en almuerzo y cena.</p></div></li><li><span>¼</span><div><strong>Proteína</strong><p>Pollo, pescado, huevos, legumbres o lácteos.</p></div></li><li><span>¼</span><div><strong>Carbohidrato</strong><p>Arroz, papa, pasta o legumbres en porción medida.</p></div></li><li><span>○</span><div><strong>Bebidas</strong><p>Agua como base; elimina bebidas azucaradas y limita alcohol.</p></div></li></ul></article>
            <article className="soft-card plan-card warning-card"><p className="eyebrow">Seguridad</p><h2>La presión manda</h2><div className="pressure-number">&gt;180 <small>o</small> &gt;120</div><p>No entrenes. Repite la lectura después de unos minutos y contacta a un profesional. Con dolor de pecho, falta de aire, debilidad, alteración visual o dificultad para hablar, busca atención urgente.</p><ul><li>Respira durante cada repetición.</li><li>No entrenes al fallo: deja 3–4 repeticiones en reserva.</li><li>Detente ante mareo, desmayo o falta de aire anormal.</li><li>Por ahora evita swings, snatches y press sobre la cabeza.</li></ul></article>
            <article className="soft-card plan-card"><p className="eyebrow">Hábitos base</p><h2>Lo pequeño suma</h2><ul className="habit-list"><li><i>01</i><span><strong>Interrumpe el asiento</strong>Camina 3–5 minutos por cada hora sentado.</span></li><li><i>02</i><span><strong>Duerme con horario</strong>La recuperación también forma parte del plan.</span></li><li><i>03</i><span><strong>Reduce el sodio</strong>Menos embutidos, snacks y comida preparada.</span></li><li><i>04</i><span><strong>No falles dos veces</strong>Si pierdes una sesión, vuelve en la siguiente.</span></li></ul></article>
          </section>
          <div className="medical-note"><strong>Importante:</strong> este plan es educativo y no sustituye la evaluación de tu médico. Con hipertensión y tu nivel actual de sedentarismo, confirma que puedes iniciar ejercicio y no cambies medicamentos por tu cuenta.</div>
          <section className="sources">
            <p className="eyebrow">Fuentes y lugar de entrenamiento</p>
            <div>
              <a href="https://www.heart.org/en/health-topics/high-blood-pressure/changes-you-can-make-to-manage-high-blood-pressure/getting-active-to-control-high-blood-pressure" target="_blank" rel="noreferrer">American Heart Association · Actividad e hipertensión ↗</a>
              <a href="https://www.heart.org/en/health-topics/high-blood-pressure/understanding-blood-pressure-readings/when-to-call-911-for-high-blood-pressure" target="_blank" rel="noreferrer">American Heart Association · Lecturas de emergencia ↗</a>
              <a href="https://www.who.int/europe/publications/i/item/9789240014886" target="_blank" rel="noreferrer">OMS · Actividad física y sedentarismo ↗</a>
              <a href="https://mindfit.cl/san-martin/" target="_blank" rel="noreferrer">MindFit San Martín ↗</a>
            </div>
          </section>
        </div>}

        {selectedGuide && <div className="modal-backdrop guide-backdrop" role="presentation" onMouseDown={event => { if (event.target === event.currentTarget) setSelectedGuide(null); }}>
          <section ref={guideModalRef} className="exercise-guide-modal" role="dialog" aria-modal="true" aria-labelledby="guide-title" aria-describedby="guide-description">
            <button className="modal-close" type="button" autoFocus onClick={() => setSelectedGuide(null)} aria-label="Cerrar guía">×</button>
            <div className="guide-visual">
              <img src={selectedGuide.guide.image} alt={selectedGuide.guide.alt} width="900" height="900" loading="eager" decoding="async" />
              <span>INICIO <i /> MOVIMIENTO CONTROLADO</span>
            </div>
            <div className="guide-content">
              <p className="eyebrow">Guía visual de técnica</p>
              <h2 id="guide-title">{selectedGuide.name}</h2>
              <p id="guide-description" className="guide-prescription">{selectedGuide.prescription}</p>
              <ol>
                {selectedGuide.guide.steps.map((step, index) => <li key={step}><span>{String(index + 1).padStart(2, "0")}</span><p>{step}</p></li>)}
              </ol>
              <div className="technique-cue"><span>◎</span><div><small>CLAVE DE POSTURA</small><p>{selectedGuide.guide.focus}</p></div></div>
              <div className="breathing-cue"><span>≈</span><div><small>RESPIRACIÓN</small><p>{selectedGuide.guide.breathing}</p></div></div>
              <p className="guide-safety">La imagen es una referencia. Ajusta cada máquina con el instructor de MindFit y detente ante dolor, mareo, desmayo o falta de aire anormal.</p>
              <div className="guide-sources">
                <a href="https://www.heart.org/en/health-topics/high-blood-pressure/changes-you-can-make-to-manage-high-blood-pressure/getting-active-to-control-high-blood-pressure" target="_blank" rel="noreferrer">AHA · Ejercicio e hipertensión ↗</a>
                <a href="https://www.nhs.uk/live-well/exercise/strength-exercises/" target="_blank" rel="noreferrer">NHS · Técnica básica ↗</a>
              </div>
            </div>
          </section>
        </div>}

        {authOpen && <div className="modal-backdrop" role="presentation" onMouseDown={event => { if (event.target === event.currentTarget) setAuthOpen(false); }}>
          <section className="auth-modal" role="dialog" aria-modal="true" aria-labelledby="auth-title">
            <button className="modal-close" onClick={() => setAuthOpen(false)} aria-label="Cerrar">×</button>
            <div className="cloud-orb">☁</div>
            <p className="eyebrow">Nube personal activa</p>
            <h2 id="auth-title">Tus datos están contigo.</h2>
            <p>Los cambios de este dispositivo se guardan en tu cuenta y aparecerán al iniciar sesión desde el celular o computador.</p>
            <div className={`sync-detail ${syncStatus}`}><i>{syncStatus === "syncing" ? "↻" : syncStatus === "error" ? "!" : "✓"}</i><span><strong>{syncStatus === "syncing" ? "Sincronizando cambios" : syncStatus === "error" ? "No se pudo sincronizar" : "Todo sincronizado"}</strong><small>{cloudUser.email}</small></span></div>
            {authMessage && <div className="auth-message">{authMessage}</div>}
            <button className="secondary-action" onClick={signOutSecurely}>CERRAR SESIÓN Y BORRAR DATOS DE ESTE EQUIPO</button>
          </section>
        </div>}

        {saveMessage && <div className="toast" role="status">{saveMessage}</div>}

        <footer className="legal-links"><a href="./privacy.html">Privacidad</a><a href="./terms.html">Términos</a></footer>
        <nav className="mobile-nav" aria-label="Navegación móvil">{nav.map(item=><button key={item.key} className={view===item.key?"active":""} onClick={()=>setView(item.key)}><i>{item.icon}</i><span>{item.key==="evolucion"?"Evolución":item.label.split(" ")[0]}</span></button>)}</nav>
      </main>
    </div>
  );
}

function GapRow({label,value,target,unit}:{label:string;value:number;target:number;unit:string}) {
  const percent = Math.min(100, value / target * 100);
  return <div className="gap-row"><div><span>{label}</span><strong>{value}/{target} <small>{unit}</small></strong></div><div className="soft-progress"><i style={{width:`${percent}%`}}/></div></div>;
}
function PageTitle({eyebrow,title,text}:{eyebrow:string;title:string;text:string}) {
  return <header className="page-title"><p className="eyebrow">{eyebrow}</p><h1>{title}</h1><p>{text}</p></header>;
}
function Metric({label,value,detail,accent=false}:{label:string;value:string;detail:string;accent?:boolean}) {
  return <article className={`soft-card metric ${accent?"accent":""}`}><span>{label}</span><strong>{value}</strong><p>{detail}</p></article>;
}
function Milestone({label,value,active=false}:{label:string;value:number;active?:boolean}) {
  return <div className={`milestone ${active?"active":""}`}><i>{active?"✓":""}</i><span>{label}</span><strong>{value.toFixed(1)} kg</strong></div>;
}

createRoot(document.getElementById("root")!).render(<React.StrictMode><App /></React.StrictMode>);
