# Ruta Fuerte

Aplicación personal y responsive para consultar un plan de entrenamiento de
ocho semanas, registrar actividad, presión arterial y peso, y seguir la
evolución mediante métricas, gráficos y logros.

## Funciones

- Rutinas detalladas para lunes y miércoles en gimnasio.
- Entrenamiento complementario con kettlebell y caminatas progresivas.
- Checklist diario y temporizador de descansos.
- Historial de peso, presión, actividad, pasos, agua, energía y notas.
- Sincronización privada entre dispositivos mediante una cuenta personal.
- Progresión desbloqueable de rutinas y cargas en kilos.
- Evolución de peso, brechas semanales y logros.
- Exportación e importación del historial en formato JSON.
- Diseño Soft UI responsive y soporte para movimiento reducido.

## Desarrollo

```bash
npm install
npm run dev
```

## Sincronización con Supabase

1. Ejecuta `supabase/setup.sql` en el editor SQL del proyecto.
2. Crea `.env.local` con `VITE_SUPABASE_URL` y
   `VITE_SUPABASE_PUBLISHABLE_KEY`.
3. Para GitHub Pages, crea las variables `VITE_SUPABASE_URL` y
   `VITE_SUPABASE_PUBLISHABLE_KEY` en *Settings → Secrets and variables →
   Actions → Variables*.

El inicio con Google está implementado mediante PKCE y protegido por la variable
`VITE_GOOGLE_AUTH_ENABLED`. Consulta `GOOGLE_OAUTH_SETUP.md` para activar el
proveedor sin exponer su Client Secret.

La tabla aplica seguridad por filas: cada cuenta autenticada solo puede leer y
modificar sus propios datos. Nunca uses una clave `service_role` en el
navegador.

## Nota

La aplicación es educativa y no reemplaza evaluación, diagnóstico ni
indicaciones médicas.
