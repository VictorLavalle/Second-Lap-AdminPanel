# Login desde móvil / LAN en desarrollo — causas y fixes

Nota operativa (local, no versionada). Resume por qué el login del admin panel
fallaba **solo desde el celular** (vía IP de red sobre HTTP) y funcionaba en la
laptop (vía `http://localhost`), y cómo quedó resuelto. Objetivo: no volver a
investigar esto desde cero.

## Síntoma

- En laptop por `http://localhost:3001` → login OK.
- En celular por `http://192.168.1.236:3001` → "Entrando…" y rebote a `/login`.
- Además, ruido en consola del móvil: `TypeError: Cannot write to a CLOSED
  writable stream`.

## Causa raíz: la cookie de sesión (dos problemas sumados)

Ambos solo se manifiestan sobre `http://<IP-LAN>` (HTTP sin TLS). `localhost`
es "contexto seguro" por excepción del navegador y los navegadores de escritorio
son indulgentes, por eso en la laptop no se veía.

1. **`Secure: true` incondicional.** Los navegadores descartan cookies `Secure`
   sobre HTTP. El móvil (HTTP por IP) tiraba la cookie → sin sesión → `/login`.
2. **`SameSite=Strict`.** Aun aceptando la cookie, `Strict` no la reenvía en la
   navegación top-level a `/productos` que sigue al POST de login en algunos
   navegadores móviles → el proxy no ve sesión → `/login`.

### Fix (en `src/lib/authSession.ts`, `cookieOptions`)

```ts
secure: process.env.NODE_ENV === "production", // prod sí, dev no (HTTP LAN)
sameSite: "lax",                                // viaja en nav top-level GET
httpOnly: true,                                 // siempre
```

- Producción conserva `HttpOnly + Secure + SameSite=Lax` (postura estándar y
  sólida; `Lax` sigue bloqueando subrequests cross-site, la protección CSRF
  relevante).
- Dev sin `Secure` para poder entrar por HTTP sobre IP de red.
- Commits: `2c8bfae` (Secure condicional), `76651ce` (SameSite=Lax).

## Falso culpable: `Cannot write to a CLOSED writable stream`

NO era de código. El stack trace apunta a
`next/src/client/dev/hot-reloader/app/hot-reloader-app.tsx` → es el **HMR de
`pnpm dev` (Turbopack)** tropezando sobre la red al accederse por IP LAN. Se
confirma porque **desaparece en `pnpm build && pnpm start`**. No existe en
producción. (Durante la depuración se atribuyó por error a `router.refresh()`;
quitarlo fue una mejora legítima —evita una doble navegación— pero no era la
causa de este error. Commit `2f014f4`.)

## Otros fixes relacionados de la misma sesión

- `ad2154c` — `method="post"` en los `<form>` (`LoginForm`, `ProductForm`):
  evita que un submit **nativo pre-hidratación** serialice las credenciales en
  la URL por GET (`/login?username=...&password=...`). Fuga real observada.
- `9fa3b67` — `data-scroll-behavior="smooth"` en `<html>`: silencia el warning
  de Next sobre scroll en transiciones de ruta.

## Cómo probar correctamente desde el móvil

1. Reiniciar `pnpm dev` tras cualquier cambio de cookies/servidor (si no, el
   dev server sirve el build viejo en memoria).
2. `allowedDevOrigins` ya incluye `192.168.1.*` en `next.config.ts` (dev-only).
3. Para una prueba **fiel a producción**, usar `pnpm build && pnpm start` y
   entrar por `http://192.168.1.236:3000` — sin HMR, sin el ruido de stream.
4. Si vuelve a rebotar a `/login`: conectar el teléfono por USB y usar DevTools
   remoto (`chrome://inspect`) → Application → Cookies, y verificar si
   `sl_session` se guarda tras el login. Ese es el dato definitivo antes de
   tocar la capa de auth de nuevo.
