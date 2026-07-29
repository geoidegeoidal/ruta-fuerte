import React, { useEffect, useMemo, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import "./styles.css";

type View = "hoy" | "historial" | "evolucion" | "logros" | "plan";
type SessionKey = "lunes" | "miercoles" | "viernes" | "caminar";
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
  startedAt: string;
};
type Exercise = { name: string; prescription: string; note?: string };

const STORE_KEY = "ruta-fuerte-data-v2";
const today = () => new Date().toLocaleDateString("en-CA");
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
        { name: "Prensa de piernas", prescription: "2 × 10–12" },
        { name: "Press de pecho en máquina", prescription: "2 × 10–12" },
        { name: "Remo sentado", prescription: "2 × 10–12" },
        { name: "Curl femoral", prescription: "2 × 10–12" },
        { name: "Jalón al pecho", prescription: "2 × 10–12" },
        { name: "Elevación de talones", prescription: "2 × 12–15" },
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
        { name: "Prensa de piernas", prescription: "2 × 10–12" },
        { name: "Press de pecho en máquina", prescription: "2 × 10–12" },
        { name: "Remo sentado", prescription: "2 × 10–12" },
        { name: "Extensión de piernas", prescription: "2 × 10–12", note: "Omítela si molesta la rodilla." },
        { name: "Jalón al pecho", prescription: "2 × 10–12" },
        { name: "Abducción de cadera", prescription: "2 × 12–15" },
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
        { name: "Peso muerto con kettlebell", prescription: "10 rep" },
        { name: "Sentarse y levantarse de una silla", prescription: "10 rep" },
        { name: "Remo con apoyo", prescription: "8 por lado" },
        { name: "Flexiones contra la pared", prescription: "10 rep" },
        { name: "Caminata con peso a un costado", prescription: "20–30 s/lado" },
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
};

const initialStore: Store = { logs: [], checks: {}, startedAt: today() };

function loadStore(): Store {
  try {
    const saved = JSON.parse(localStorage.getItem(STORE_KEY) || "null");
    if (saved?.logs && saved?.checks) return saved;
  } catch { /* start clean */ }
  return initialStore;
}

function sessionForToday(): SessionKey {
  const day = new Date().getDay();
  if (day === 1) return "lunes";
  if (day === 3) return "miercoles";
  if (day === 5) return "viernes";
  return "caminar";
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
  const [view, setView] = useState<View>("hoy");
  const [sessionKey, setSessionKey] = useState<SessionKey>(sessionForToday);
  const [timer, setTimer] = useState(90);
  const [timerRunning, setTimerRunning] = useState(false);
  const [form, setForm] = useState({ date: today(), weight: "", systolic: "", diastolic: "", activeMinutes: "", steps: "", water: "", energy: "3", note: "" });
  const [saveMessage, setSaveMessage] = useState("");
  const importRef = useRef<HTMLInputElement>(null);

  useEffect(() => { localStorage.setItem(STORE_KEY, JSON.stringify(store)); }, [store]);
  useEffect(() => {
    if (!timerRunning) return;
    const id = window.setInterval(() => setTimer(value => {
      if (value <= 1) { setTimerRunning(false); return 0; }
      return value - 1;
    }), 1000);
    return () => window.clearInterval(id);
  }, [timerRunning]);

  const session = sessions[sessionKey];
  const allExercises = session.blocks.flatMap((block, bi) => block.exercises.map((exercise, ei) => ({ ...exercise, id: `${today()}-${sessionKey}-${bi}-${ei}` })));
  const doneCount = allExercises.filter(e => store.checks[e.id]).length;
  const donePercent = Math.round(doneCount / allExercises.length * 100);
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

  function mergeLog(entry: LogEntry) {
    setStore(current => {
      const existing = current.logs.find(l => l.date === entry.date);
      const logs = existing
        ? current.logs.map(l => l.date === entry.date ? { ...l, ...entry, id: l.id } : l)
        : [...current.logs, entry];
      return { ...current, logs };
    });
  }

  function finishSession() {
    mergeLog({
      id: crypto.randomUUID(), date: today(), activeMinutes: session.duration,
      session: sessionKey, sessionDone: true,
    });
    setSaveMessage("Entrenamiento guardado en tu historial.");
    window.setTimeout(() => setSaveMessage(""), 3000);
  }

  function saveDailyLog(event: React.FormEvent) {
    event.preventDefault();
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
      note: form.note || existing?.note,
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
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(String(reader.result));
        if (!Array.isArray(parsed.logs) || typeof parsed.checks !== "object") throw new Error();
        setStore(parsed);
        setSaveMessage("Respaldo importado correctamente.");
      } catch { setSaveMessage("Ese archivo no es un respaldo válido."); }
    };
    reader.readAsText(file);
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
        <button className="logo" onClick={() => setView("hoy")} aria-label="Ruta Fuerte, inicio"><span>RF</span><strong>Ruta Fuerte</strong></button>
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
        <p className="local-note">Tus datos quedan en este dispositivo.</p>
      </aside>

      <main className="content">
        <header className="mobile-header">
          <button className="logo" onClick={() => setView("hoy")}><span>RF</span><strong>Ruta Fuerte</strong></button>
          <div className="streak-pill">◉ {streak} días</div>
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
                <div><p className="eyebrow">Tu entrenamiento</p><h2>{session.label} · {session.title}</h2><span>{session.place} · {session.duration} min</span></div>
                <div className="completion-ring" style={{ "--progress": `${donePercent * 3.6}deg` } as React.CSSProperties}><strong>{donePercent}%</strong></div>
              </div>
              <div className="session-switch" role="tablist" aria-label="Elegir sesión">
                {(Object.keys(sessions) as SessionKey[]).map(key => <button role="tab" aria-selected={key === sessionKey} className={key === sessionKey ? "active" : ""} onClick={() => setSessionKey(key)} key={key}>{sessions[key].label}</button>)}
              </div>
              <div className="exercise-list">
                {session.blocks.map((block, bi) => <div className="exercise-block" key={block.title}>
                  <div className="block-label"><span>{block.time}</span><strong>{block.title}</strong></div>
                  {block.exercises.map((exercise, ei) => {
                    const id = `${today()}-${sessionKey}-${bi}-${ei}`;
                    return <button key={exercise.name} className={`exercise ${store.checks[id] ? "done" : ""}`} onClick={() => toggleExercise(id)} aria-pressed={Boolean(store.checks[id])}>
                      <i>{store.checks[id] ? "✓" : ""}</i><span><strong>{exercise.name}</strong>{exercise.note && <small>{exercise.note}</small>}</span><b>{exercise.prescription}</b>
                    </button>;
                  })}
                </div>)}
              </div>
              <div className="workout-actions">
                <button className="primary" onClick={finishSession}>GUARDAR SESIÓN</button>
                <div className="timer"><span>Descanso</span><strong>{String(Math.floor(timer / 60)).padStart(2, "0")}:{String(timer % 60).padStart(2, "0")}</strong><button onClick={() => { if (timer === 0) setTimer(90); setTimerRunning(v => !v); }}>{timerRunning ? "Ⅱ" : "▶"}</button><button onClick={() => { setTimerRunning(false); setTimer(90); }}>↺</button></div>
              </div>
            </article>

            <aside className="side-stack">
              <article className="soft-card week-card">
                <div className="card-heading compact"><div><p className="eyebrow">Esta semana</p><h3>Tu brecha</h3></div><strong>{Math.min(100, Math.round(weekMinutes / 150 * 100))}%</strong></div>
                <GapRow label="Gimnasio" value={weekGym} target={2} unit="sesiones" />
                <GapRow label="Caminatas" value={weekWalks} target={3} unit="salidas" />
                <GapRow label="Actividad" value={weekMinutes} target={150} unit="min" />
                <p className="gap-message">{weekMinutes >= 150 ? "Meta semanal conseguida. Excelente." : `Faltan ${Math.max(0, 150 - weekMinutes)} minutos. Cada caminata suma.`}</p>
              </article>
              <article className="soft-card quick-log">
                <p className="eyebrow">Registro rápido</p><h3>¿Cómo vas?</h3>
                <form onSubmit={saveDailyLog}>
                  <div className="field-pair"><label>Peso<input inputMode="decimal" placeholder="110,0" value={form.weight} onChange={e => setForm({...form, weight:e.target.value})}/><span>kg</span></label><label>Minutos<input inputMode="numeric" placeholder="20" value={form.activeMinutes} onChange={e => setForm({...form, activeMinutes:e.target.value})}/><span>min</span></label></div>
                  <div className="field-pair"><label>Presión sistólica<input inputMode="numeric" placeholder="130" value={form.systolic} onChange={e => setForm({...form, systolic:e.target.value})}/></label><label>Diastólica<input inputMode="numeric" placeholder="85" value={form.diastolic} onChange={e => setForm({...form, diastolic:e.target.value})}/></label></div>
                  {(Number(form.systolic) > 180 || Number(form.diastolic) > 120) && <div className="bp-alert">No entrenes. Repite la medición y contacta a un profesional; con síntomas, busca atención urgente.</div>}
                  <button className="primary full">GUARDAR REGISTRO</button>
                </form>
              </article>
            </aside>
          </section>
        </div>}

        {view === "historial" && <div className="view">
          <PageTitle eyebrow="Tu bitácora" title="Historial diario" text="Registra lo suficiente para ver patrones. No necesitas perseguir números perfectos." />
          <section className="history-grid">
            <form className="soft-card full-log" onSubmit={saveDailyLog}>
              <h2>Nuevo registro</h2>
              <div className="form-grid">
                <label>Fecha<input type="date" value={form.date} onChange={e => setForm({...form,date:e.target.value})}/></label>
                <label>Peso<input inputMode="decimal" placeholder="kg" value={form.weight} onChange={e => setForm({...form,weight:e.target.value})}/></label>
                <label>Presión sistólica<input inputMode="numeric" placeholder="130" value={form.systolic} onChange={e => setForm({...form,systolic:e.target.value})}/></label>
                <label>Presión diastólica<input inputMode="numeric" placeholder="85" value={form.diastolic} onChange={e => setForm({...form,diastolic:e.target.value})}/></label>
                <label>Minutos activos<input inputMode="numeric" placeholder="20" value={form.activeMinutes} onChange={e => setForm({...form,activeMinutes:e.target.value})}/></label>
                <label>Pasos<input inputMode="numeric" placeholder="4500" value={form.steps} onChange={e => setForm({...form,steps:e.target.value})}/></label>
                <label>Vasos de agua<input inputMode="numeric" placeholder="6" value={form.water} onChange={e => setForm({...form,water:e.target.value})}/></label>
                <label>Energía<select value={form.energy} onChange={e => setForm({...form,energy:e.target.value})}><option value="1">1 · Muy baja</option><option value="2">2 · Baja</option><option value="3">3 · Normal</option><option value="4">4 · Buena</option><option value="5">5 · Excelente</option></select></label>
                <label className="wide">Nota<textarea placeholder="Sueño, molestias, cómo se sintió el entrenamiento…" value={form.note} onChange={e => setForm({...form,note:e.target.value})}/></label>
              </div>
              <button className="primary">GUARDAR EN HISTORIAL</button>
            </form>
            <div className="data-tools soft-card"><h3>Respaldo</h3><p>Los datos viven en este navegador. Descarga una copia para conservarlos o moverlos a otro dispositivo.</p><button onClick={exportData}>↓ EXPORTAR DATOS</button><button onClick={() => importRef.current?.click()}>↑ IMPORTAR RESPALDO</button><input ref={importRef} type="file" accept="application/json" hidden onChange={importData}/></div>
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
          <section className="week-plan">
            {[["LUN","MindFit","Fuerza A · 60 min"],["MAR","Caminar","15–30 min"],["MIÉ","MindFit","Fuerza B · 60 min"],["JUE","Recuperar","Caminata suave"],["VIE","Casa","Kettlebell · 25 min"],["SÁB","Caminar","15–30 min"],["DOM","Descanso","Moverse suave"]].map((d,i)=><article className={`soft-card ${[0,2,4].includes(i)?"focus":""}`} key={d[0]}><span>{d[0]}</span><h3>{d[1]}</h3><p>{d[2]}</p></article>)}
          </section>
          <section className="plan-grid">
            <article className="soft-card plan-card"><p className="eyebrow">Progresión</p><h2>Subir sin apurarse</h2><div className="timeline">
              <div><span>01–02</span><strong>Adaptar</strong><p>2 gimnasios, 1 kettlebell y caminatas de 15 minutos.</p></div>
              <div><span>03–04</span><strong>Construir</strong><p>Agrega la segunda caminata y llega a 20 minutos.</p></div>
              <div><span>05–06</span><strong>Consolidar</strong><p>Si recuperas bien, usa 3 series y camina 25 minutos.</p></div>
              <div><span>07–08</span><strong>Sostener</strong><p>Busca 150 minutos semanales y caminatas de 30 minutos.</p></div>
            </div></article>
            <article className="soft-card plan-card"><p className="eyebrow">Alimentación</p><h2>Lo que mueve la balanza</h2><ul className="guideline-list"><li><span>½</span><div><strong>Verduras</strong><p>La mitad del plato en almuerzo y cena.</p></div></li><li><span>¼</span><div><strong>Proteína</strong><p>Pollo, pescado, huevos, legumbres o lácteos.</p></div></li><li><span>¼</span><div><strong>Carbohidrato</strong><p>Arroz, papa, pasta o legumbres en porción medida.</p></div></li><li><span>○</span><div><strong>Bebidas</strong><p>Agua como base; elimina bebidas azucaradas y limita alcohol.</p></div></li></ul></article>
            <article className="soft-card plan-card warning-card"><p className="eyebrow">Seguridad</p><h2>La presión manda</h2><div className="pressure-number">&gt;180 <small>o</small> &gt;120</div><p>No entrenes. Repite la lectura después de unos minutos y contacta a un profesional. Con dolor de pecho, falta de aire, debilidad, alteración visual o dificultad para hablar, busca atención urgente.</p><ul><li>Respira durante cada repetición.</li><li>No entrenes al fallo: deja 3–4 repeticiones en reserva.</li><li>Detente ante mareo, desmayo o falta de aire anormal.</li><li>Por ahora evita swings, snatches y press sobre la cabeza.</li></ul></article>
            <article className="soft-card plan-card"><p className="eyebrow">Hábitos base</p><h2>Lo pequeño suma</h2><ul className="habit-list"><li><i>01</i><span><strong>Interrumpe el asiento</strong>Camina 3–5 minutos por cada hora sentado.</span></li><li><i>02</i><span><strong>Duerme con horario</strong>La recuperación también forma parte del plan.</span></li><li><i>03</i><span><strong>Reduce el sodio</strong>Menos embutidos, snacks y comida preparada.</span></li><li><i>04</i><span><strong>No falles dos veces</strong>Si pierdes una sesión, vuelve en la siguiente.</span></li></ul></article>
          </section>
          <div className="medical-note"><strong>Importante:</strong> este plan es educativo y no sustituye la evaluación de tu médico. Con hipertensión y tu nivel actual de sedentarismo, confirma que puedes iniciar ejercicio y no cambies medicamentos por tu cuenta.</div>
        </div>}

        {saveMessage && <div className="toast" role="status">{saveMessage}</div>}

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
