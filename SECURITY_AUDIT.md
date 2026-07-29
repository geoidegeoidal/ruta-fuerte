# Auditoría de seguridad — 29 de julio de 2026

## Alcance

- SPA pública en `https://geoidegeoidal.github.io/ruta-fuerte/`
- Dependencias npm y cadena de suministro de GitHub Actions
- Autenticación, Data API, permisos y RLS de Supabase
- Entradas de usuario, importación de respaldos y almacenamiento local

Las pruebas fueron no destructivas. No se realizaron denegación de servicio,
ingeniería social, ataques a infraestructura de GitHub/Supabase ni pruebas con
credenciales reales de terceros.

## Resultado

No quedaron hallazgos críticos, altos o moderados conocidos dentro del alcance.

| Prueba | Resultado |
| --- | --- |
| Auditoría npm completa | 0 vulnerabilidades tras actualizar Vite, PostCSS y esbuild |
| Acceso anónimo a `user_data` | Bloqueado con HTTP 401 / PostgREST 42501 |
| RLS | Habilitada y forzada |
| Políticas de `user_data` | 4: select, insert, update y delete vinculadas a `auth.uid()` |
| Privilegio `anon` de lectura | `false` |
| Límite de payload en base de datos | Constraint de 1 MB activo |
| Payload XSS en notas | Renderizado como texto; no creó elementos ni ejecutó HTML |
| Valor numérico fuera de rango | Rechazado antes de guardar |
| Build y TypeScript | Correctos |
| Invariantes automatizadas | Correctas |

## Hallazgos corregidos

1. **Separación local entre cuentas.** Antes, el historial podía permanecer en
   el navegador al cerrar sesión. Ahora se asocia al propietario, se bloquea la
   interfaz hasta verificar la sesión y se borra al salir.
2. **Defensa XSS.** Se agregó CSP estricta para scripts, conexiones, marcos,
   objetos, workers, formularios y URL base. Las notas continúan usando el
   escapado de React.
3. **Entradas no confiables.** Datos locales, nube y archivos JSON se normalizan
   mediante lista permitida, rangos y límites. Los respaldos mayores a 1 MB se
   rechazan.
4. **Contraseñas.** Supabase y la interfaz exigen 12 caracteres, minúscula,
   mayúscula, número y símbolo. La confirmación de correo permanece activa y
   los cambios de contraseña requieren sesión reciente y contraseña actual.
5. **Cadena de suministro.** Las GitHub Actions están fijadas a commits
   inmutables, Dependabot está configurado y las auditorías se ejecutan
   semanalmente y en cada cambio.
6. **Dependencias vulnerables.** Vite, PostCSS y esbuild se actualizaron a
   versiones corregidas.

## Riesgos residuales y límites

- La sesión de Supabase en una SPA estática se persiste en almacenamiento
  accesible a JavaScript. El control ideal —cookie `HttpOnly` mediante un
  Backend-for-Frontend— requiere abandonar el alojamiento puramente estático.
- GitHub Pages no admite cabeceras HTTP personalizadas por repositorio. CSP y
  Referrer Policy se aplican con `meta`; `frame-ancestors` y
  `X-Content-Type-Options` requerirían un proxy u otro hosting.
- La protección de contraseñas filtradas de Supabase es una función del plan
  Pro. CAPTCHA requiere contratar/configurar un proveedor externo.
- La autorización cruzada entre dos cuentas no se probó con identidades reales;
  se verificaron externamente el bloqueo anónimo y, en base de datos, las cuatro
  políticas, RLS forzada y privilegios mínimos.

## Recomendación futura

Si la aplicación comienza a almacenar datos de más personas, migrar a un
dominio propio detrás de un hosting con cabeceras configurables y un
Backend-for-Frontend. Eso permite cookies `HttpOnly`, CSP por cabecera,
`frame-ancestors 'none'`, rate limiting propio y registros de auditoría
centralizados.
