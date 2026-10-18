# Secretos y despliegue — Second Lap Admin Panel

Notas operativas para los secretos de sesión y su manejo por ambiente.
Este archivo vive en `.kiro/` y **no se trackea** (está en `.gitignore`).

## Variables de entorno

El panel usa cuatro variables (ver `.env.example`):

| Variable | Qué hace | Restricciones |
|---|---|---|
| `BACKEND_URL` | URL base del backend que consume el BFF (server-side). | En producción es **obligatoria**; si falta, el cliente de API lanza error (no cae silenciosamente a localhost). En dev por defecto `http://localhost:8080/api/v1`. |
| `BACKEND_PUBLIC_ORIGIN` | Origen del backend permitido en el `img-src` del CSP (imágenes de producto). | Debe apuntar al origen público del backend. |
| `SESSION_SECRET` | Clave que **cifra** las credenciales Basic dentro de la cookie de sesión (AES-256-GCM). | **Debe** decodificar a exactamente **32 bytes**; el código valida y lanza error si no. |
| `SESSION_SIGNING_SECRET` | Clave que **firma** la cookie (HMAC-SHA256) para que el middleware edge la valide sin descifrar. | Sin restricción dura de longitud; usar 32 bytes es lo correcto. |

Los dos secretos (`SESSION_SECRET` y `SESSION_SIGNING_SECRET`) deben ser **distintos** entre sí.

## Cómo generar los secretos

Mismo método en todos los ambientes:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

Córrelo una vez por secreto (dos veces en total) y pega cada salida en su variable.
Para generar ambos de una (sin que el shell corte la línea larga):

```bash
printf 'SESSION_SECRET=%s\nSESSION_SIGNING_SECRET=%s\n' \
  "$(node -e "console.log(require('crypto').randomBytes(32).toString('base64'))")" \
  "$(node -e "console.log(require('crypto').randomBytes(32).toString('base64'))")"
```

(añade `>> .env` al final para anexarlo directo al archivo).

## ¿Siempre los mismos? ¿Cada cuánto cambian?

- **Por ambiente: distintos.** Dev, staging y producción tienen valores **diferentes**.
  Nunca compartas el secreto de prod con dev.
- **Dentro de un mismo ambiente: estables.** Se generan **una sola vez** al configurar
  el ambiente y se dejan fijos. No se regeneran en cada deploy ni en cada arranque:
  si lo hicieras, cada deploy/reinicio desconectaría a todos.
- **Rotación: planeada, no en un calendario rígido.**
  - Rotación periódica de higiene (p. ej. cada 3–12 meses).
  - **Inmediata** ante sospecha de filtración (apareció en un log, en el repo, etc.).

### Qué pasa al cambiar un secreto
Cambiar `SESSION_SECRET` o `SESSION_SIGNING_SECRET` invalida **todas las sesiones
existentes** → la gente vuelve a iniciar sesión. **No se pierde ningún dato**
(los datos viven en el backend; el secreto solo protege cookies). En este proyecto
el store de refresh es **in-memory single-instance**, así que un reinicio del servidor
ya invalida sesiones de por sí. Costo de rotar: trivial para una herramienta de un
solo admin.

## Dónde se guardan por ambiente

Lo que cambia entre ambientes **no es cómo se genera** el string, sino **dónde se guarda**.

- **Dev (local):** archivo `.env` / `.env.local` en la raíz del repo. Ya está en
  `.gitignore` (`.env*` excepto `.env.example`); **nunca** se commitea.
- **Producción / otros ambientes:** NO en un archivo dentro del repo. Van en el
  **gestor de secretos / variables de entorno de la plataforma**, inyectadas al
  proceso en runtime:
  - **Vercel / Netlify:** Project → Settings → Environment Variables (una entrada por
    ambiente: Production / Preview / Development).
  - **Contenedores / Kubernetes:** un `Secret` montado como variable de entorno
    (no horneado en la imagen).
  - **AWS (solo referencia):** Secrets Manager o SSM Parameter Store leído al arrancar.
    Nota del proyecto: la regla es **no desplegar recursos AWS**; esto es solo contexto
    general, no una instrucción de despliegue aquí.
  - **Servidor propio:** archivo de entorno con permisos restringidos fuera del árbol
    del repo, o el secret store del orquestador.

## Reglas que el código ya respeta

- Secretos **solo por variables de entorno**; nada hardcodeado ni commiteado.
- `.env*` está en `.gitignore` (salvo `.env.example`, que solo documenta las claves vacías).
- `SESSION_SECRET` validado a 32 bytes en runtime.
- CI inyecta secretos **dummy** (no reales) para que la suite de tests con crypto corra;
  ver `.github/workflows/ci.yml`.

## Nota operativa del backend

Si pruebas contra el backend real, recompílalo/reinícialo para que tome la migración V4
y el código nuevo del ciclo de pedidos; con un binario viejo verás errores de validación
de esquema o 500 fantasma.
