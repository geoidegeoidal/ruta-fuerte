# Activar inicio de sesión con Google

El código ya está preparado con OAuth Authorization Code + PKCE. El botón se
mantiene oculto hasta completar la configuración para evitar ofrecer un acceso
que falle.

## 1. Crear el cliente en Google Auth Platform

En la consola de Google, crea un cliente OAuth de tipo **Web application**.

- Nombre sugerido: `Ruta Fuerte Web`
- Authorized JavaScript origin:
  `https://geoidegeoidal.github.io`
- Authorized redirect URI:
  `https://nkousinnbudlcsxmmmmr.supabase.co/auth/v1/callback`

Para la pantalla de consentimiento:

- Homepage: `https://geoidegeoidal.github.io/ruta-fuerte/`
- Privacy policy:
  `https://geoidegeoidal.github.io/ruta-fuerte/privacy.html`
- Terms:
  `https://geoidegeoidal.github.io/ruta-fuerte/terms.html`

La aplicación solo necesita identidad básica (`openid`, correo y perfil). No
solicites Drive, Gmail, contactos ni scopes adicionales.

## 2. Guardar las credenciales directamente en Supabase

En **Supabase → Authentication → Sign In / Providers → Google**:

1. activa Google;
2. pega el Client ID;
3. pega el Client Secret;
4. guarda.

No pegues el Client Secret en GitHub, archivos `.env` públicos, issues, capturas
ni conversaciones. Supabase es el único lugar que debe conservarlo.

## 3. Habilitar el botón

En **GitHub → Settings → Secrets and variables → Actions → Variables**, define:

`VITE_GOOGLE_AUTH_ENABLED=true`

Después ejecuta nuevamente el workflow **Deploy to GitHub Pages**.

## 4. Prueba final

Abre una ventana privada, pulsa **Continuar con Google** y verifica:

1. que Google muestre `Ruta Fuerte`;
2. que solo solicite correo y perfil;
3. que regrese exactamente a
   `https://geoidegeoidal.github.io/ruta-fuerte/`;
4. que al cerrar sesión se borre el historial local del dispositivo;
5. que el mismo historial aparezca al entrar desde otro dispositivo.
