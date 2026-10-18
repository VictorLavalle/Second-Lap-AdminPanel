# CSP (Content Security Policy) — Second Lap Admin Panel

Notas de la capa de seguridad CSP: cómo está configurada, por qué, el bug latente
que se corrigió y el tradeoff de rendering que implica.
Este archivo vive en `.kiro/` y **no se trackea** (está en `.gitignore`).

## Estado final (producción)

CSP emitida per-request por el middleware (`src/middleware.ts`), construida en
`src/lib/securityHeaders.ts` (`buildContentSecurityPolicy`):

```
default-src 'none';
script-src 'self' 'nonce-<nonce>' 'strict-dynamic';
style-src 'self' 'nonce-<nonce>';
img-src 'self' data: blob: <BACKEND_PUBLIC_ORIGIN>;
font-src 'self' data:;
connect-src 'self';
form-action 'self';
base-uri 'self';
frame-ancestors 'none';
object-src 'none';
style-src-attr 'unsafe-inline';
```

- **script-src**: `'self' 'nonce-…' 'strict-dynamic'` — sin `'unsafe-inline'`.
- **style-src**: `'self' 'nonce-…'` — sin `'unsafe-inline'`.
- **style-src-attr**: `'unsafe-inline'` — ver "Atributos de estilo inline" abajo.
- El resto de cabeceras de hardening (`X-Frame-Options`, `X-Content-Type-Options`,
  `Referrer-Policy`, `Permissions-Policy`) son estáticas y viven en
  `next.config.ts` vía `buildStaticSecurityHeaders`. La CSP NO está ahí (lleva
  nonce per-request); se emite solo en el middleware para no duplicar cabeceras.

### Desarrollo (dev)
En dev la CSP se relaja porque Turbopack HMR inyecta scripts eval'd y `<style>`
en runtime que un nonce no cubre:

```
script-src 'self' 'unsafe-inline' 'unsafe-eval';
style-src  'self' 'unsafe-inline';
connect-src 'self' ws: <backend>;   (websocket de HMR)
```

(sin `nonce-` ni `style-src-attr` en dev).

## Cómo funciona el nonce (mecanismo de Next.js)

Per la doc oficial de Next (App Router, "Content Security Policy"):

1. El middleware genera un nonce por request (`src/lib/nonce.ts`, Web Crypto —
   edge-safe, sin `node:crypto`).
2. El middleware pone la CSP con `'nonce-<nonce>'` en **DOS** sitios:
   - la cabecera de **request** (`requestHeaders.set('Content-Security-Policy', …)`
     + `x-nonce`), de donde **Next extrae el nonce** durante el SSR y lo aplica a
     sus scripts/estilos de framework.
   - la cabecera de **response**, que es la que el navegador **aplica**.
3. Next adjunta el nonce automáticamente a sus `<script>`/`<style>` y a cualquier
   `<Script nonce={…}>`.

## ⚠️ Bug latente corregido (importante)

La PR previa de CSP (`feat/csp-nonce`) dejó la CSP con nonce **solo en la cabecera
de response**. Resultado: el build compilaba y los tests unitarios (que solo
revisan el string de la cabecera) pasaban, pero **en el navegador de producción
TODOS los `<script>` de Next quedaban bloqueados**: la cabecera anunciaba
`strict-dynamic` + nonce, pero Next no veía la CSP en el request, así que no
aplicaba el nonce a los scripts → `strict-dynamic` los rechazaba (14 tags, 0 con
`nonce=`).

Lo descubrió la **verificación manual en navegador** (headless Chrome con
puppeteer-core contra `pnpm build && pnpm start`), que es obligatoria para cambios
de CSP justamente por esto: los tests de cabecera no detectan este fallo.

**Fix (en `feat/csp-style-src`):**
- Poner la CSP también en los **request headers** del middleware.
- `export const dynamic = "force-dynamic"` en `src/app/layout.tsx` (el nonce solo
  se inyecta en render dinámico; las páginas estáticas se generan en build sin
  request/response, por lo que no pueden llevar nonce).

Tras el fix, en el navegador: scripts cargan, estilos de Tailwind aplican
(tokens canvas/accent correctos) y **cero violaciones de CSP** en consola.

## Atributos de estilo inline (`style-src-attr`)

Los nonces autorizan elementos `<style>`, **no** atributos `style="..."`. El
componente `<Image>` de Next emite `style="color:transparent"` en el logo del
login. Con `style-src 'self' 'nonce-…'` ese atributo se bloqueaba (reportado bajo
`style-src-attr`, que cae a `style-src`).

Solución quirúrgica: `style-src-attr 'unsafe-inline'` **solo en producción**.
Permite los atributos de estilo inevitables que emite el framework, manteniendo
`style-src` estricto contra bloques `<style>` inyectados (el vector real de XSS).
No se usa `'unsafe-hashes'` + hash porque es frágil (el hash cambia si cambia el
valor del atributo).

## Tradeoff: rendering dinámico

Para que el nonce funcione, **todas las páginas se renderizan dinámicamente**
(`force-dynamic`). Implicaciones (de la doc de Next):
- No static optimization / no ISR / no cacheo de páginas en CDN.
- SSR en cada request (carga inicial algo más lenta, más carga de servidor).

Aceptable para esta herramienta interna de **un solo admin** (no se espera cachear
páginas en CDN). Documentado en el comentario de `src/app/layout.tsx`.

## Verificación obligatoria para cambios de CSP

Los tests unitarios de `securityHeaders` solo validan el string de la cabecera —
NO detectan si el navegador bloquea recursos. Para cualquier cambio de CSP:

1. `pnpm build && pnpm start` (modo prod; en dev la CSP es laxa y no representa prod).
2. Cargar el panel en el navegador y revisar la **consola**: cero violaciones de CSP.
3. Confirmar que los estilos (Tailwind) y los scripts (hidratación) funcionan.

Método usado en esta PR (reproducible): headless Chrome vía `puppeteer-core`
apuntando al Chrome del sistema, capturando eventos `securitypolicyviolation` y
errores de consola, más un "style probe" (computed styles de body/botón) para
confirmar que Tailwind aplicó. Se instaló puppeteer-core en un dir temporal
(`/tmp`), fuera del repo, para no tocar deps del proyecto.

## Archivos clave

- `src/lib/securityHeaders.ts` — `buildContentSecurityPolicy({isDev,backendOrigin,nonce})`,
  `buildStaticSecurityHeaders()`, y los helpers `scriptSrcDirective` /
  `styleSrcDirective` / `styleSrcAttrDirective`.
- `src/lib/nonce.ts` — `generateNonce()` edge-safe.
- `src/middleware.ts` — genera el nonce, pone la CSP en request + response,
  reenvía `x-nonce`. Debe seguir siendo edge-safe (sin `node:crypto`).
- `src/app/layout.tsx` — `export const dynamic = "force-dynamic"`.

## Deuda / posibles mejoras futuras

- `style-src-attr 'unsafe-inline'` es el único resquicio de inline que queda; se
  podría eliminar si Next deja de emitir el `style="color:transparent"` o si se
  envuelve el logo sin usar `<Image>`. Riesgo/beneficio bajo; dejar como está.
- Si se quisiera recuperar render estático/CDN, habría que abandonar el nonce y
  volver a un esquema basado en hashes (más frágil con los chunks de Next).
