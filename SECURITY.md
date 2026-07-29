# Seguridad de Ruta Fuerte

Ruta Fuerte almacena datos de salud y entrenamiento. La aplicación usa una SPA
estática en GitHub Pages y Supabase para autenticación y persistencia.

## Controles aplicados

- HTTPS y HSTS proporcionados por GitHub Pages y Supabase.
- Política de seguridad de contenido (CSP) que bloquea scripts, objetos, marcos
  y conexiones no autorizadas, además de eventos inline y sinks DOM protegidos
  con Trusted Types en navegadores compatibles.
- Clave publicable en el navegador; nunca una clave secreta o `service_role`.
- Row Level Security forzada en `public.user_data`, con políticas vinculadas a
  `auth.uid()` y sin privilegios para `anon`.
- Límite de 1 MB por respaldo y por fila de datos.
- Validación y límites de campos, fechas, notas, cargas y archivos importados.
- Separación local por propietario y borrado de datos del dispositivo al cerrar
  sesión, para impedir que otra cuenta herede el historial anterior.
- Mensajes de autenticación genéricos y rate limiting provisto por Supabase.
- OAuth de Google mediante Authorization Code + PKCE, URL de retorno constante
  y scopes mínimos de identidad.
- Auditoría semanal de dependencias y actualizaciones automáticas con
  Dependabot.

## Riesgos residuales

Supabase Auth persiste la sesión de esta SPA en almacenamiento accesible desde
JavaScript. Un Backend-for-Frontend con cookies `HttpOnly` reduciría más ese
riesgo, pero no es compatible con el alojamiento estático actual. La CSP
estricta, la ausencia de HTML dinámico y la validación de entradas reducen la
probabilidad de XSS. Evita usar la aplicación en equipos compartidos y cierra
sesión al terminar.

GitHub Pages no permite definir cabeceras HTTP personalizadas por repositorio.
Por eso CSP y Referrer Policy se aplican con etiquetas `meta`; controles como
`frame-ancestors` o `X-Content-Type-Options` requerirían un hosting o proxy que
permita cabeceras personalizadas.

## Principales clases de exploit

| Riesgo | Control |
| --- | --- |
| XSS y DOM XSS | Escapado de React, CSP, Trusted Types y prohibición de HTML dinámico |
| Inyección SQL | SDK/PostgREST parametrizado, esquema sin SQL construido desde entradas y RLS |
| IDOR / acceso cruzado | `auth.uid() = user_id` en cada operación y `anon` sin privilegios |
| CSRF / interceptación OAuth | Bearer tokens administrados por Supabase, PKCE y retorno fijo |
| Open redirect | La URL posterior al login está compilada como constante permitida |
| Credential stuffing | Google OAuth, contraseñas fuertes, confirmación de correo y rate limits |
| Archivos o payloads abusivos | JSON con lista permitida y límites de 1 MB en cliente y base |
| Supply chain | Lockfile, auditoría automática, Dependabot y Actions fijadas por SHA |
| SSRF | No hay backend que acepte URLs ni realice solicitudes arbitrarias |

Estos controles reducen riesgo; no convierten la aplicación en invulnerable.

## Reportar un problema

No publiques datos personales, tokens ni detalles explotables en un issue
público. Contacta privadamente al propietario del repositorio y entrega:

1. descripción y posible impacto;
2. pasos mínimos para reproducir;
3. versión o commit afectado;
4. evidencia sin datos reales de usuarios.

## Referencias

- [OWASP ASVS](https://owasp.org/www-project-application-security-verification-standard/)
- [OWASP Content Security Policy Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Content_Security_Policy_Cheat_Sheet.html)
- [OWASP HTML5 Security Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/HTML5_Security_Cheat_Sheet.html)
- [Supabase: Securing your data](https://supabase.com/docs/guides/database/secure-data)
- [Supabase: Row Level Security](https://supabase.com/docs/guides/database/postgres/row-level-security)
