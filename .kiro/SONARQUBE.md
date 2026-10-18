# SonarQube — setup local y MCP

Notas para analizar **Second Lap Admin Panel** con SonarQube de forma local y
aislada. Misma instancia personal que usa el storefront `../second-hand`, pero
este proyecto es otro `projectKey` dentro de ella.

## Instancia personal (Docker)

SonarQube **separado** del corporativo de WGU (que vive en `localhost:9001` y no
debe usarse para proyectos personales).

- Contenedor: `sonarqube-personal` (imagen `sonarqube:community`)
- URL: `http://localhost:9002`  (NO el corporativo de `:9001`)
- Compartido con el storefront; cada proyecto es un `projectKey` distinto.

Arrancar/parar:

```bash
docker start sonarqube-personal
docker stop sonarqube-personal
```

## Correr un análisis

```bash
# 1. generar cobertura (emite coverage/lcov.info)
pnpm test:coverage

# 2. analizar — el token NO se versiona; pásalo por entorno
export SONAR_TOKEN="<tu-token-de-análisis>"
sonar-scanner -Dsonar.host.url=http://localhost:9002 -Dsonar.token="$SONAR_TOKEN"
```

- Config del proyecto: `sonar-project.properties` (versionado, **sin secretos**).
- Dashboard: `http://localhost:9002/dashboard?id=second-lap-admin`.
- El `projectKey` es `second-lap-admin`; el scanner lo autoprovisiona en el
  primer análisis si no existe (o se crea en la UI de `:9002`).

> **Token**: genéralo en `http://localhost:9002` → My Account → Security.
> NO se commitea. Se pasa por la variable de entorno `SONAR_TOKEN` (o
> `-Dsonar.token=`). Si rota o se pierde, genera otro y reusa el flujo de arriba.
> El `<tu-token-de-análisis>` de arriba es un placeholder, no un token real.

## Alineación de exclusiones de cobertura

`sonar.coverage.exclusions` en `sonar-project.properties` **debe** reflejar las
exclusiones de cobertura de `vitest.config.mts` (fuente de verdad), para que
SonarQube no penalice lo que ya excluimos con justificación. Si cambian en
vitest, actualiza también el `.properties`. Lista actual:

- `src/app/layout.tsx` — shell raíz (fuentes, metadata).
- `src/app/page.tsx` — solo redirect a `/productos`.
- `src/app/login/page.tsx` — página estática que solo compone el form.
- `src/app/productos/page.tsx`, `.../nuevo/page.tsx`,
  `.../[id]/editar/page.tsx` — páginas estáticas que solo componen header + vista.
- `src/app/pedidos/page.tsx`, `.../[id]/page.tsx` — íd.
- `src/types/**`, `src/data/**` — sin lógica ejecutable.

## MCP de SonarQube en .kiro

`https://mcp.sonarqube.com/` es el MCP **hosted**, pensado para **SonarQube
Cloud** (requiere token de Cloud + organización). NO alcanza una instancia local
en `localhost`, así que no sirve para este contenedor.

Para una instancia local, usar el **MCP server self-hosted** de SonarSource, que
corre en tu máquina y apunta a tu URL + token. Config de ejemplo para el
`mcp.json` de Kiro (ajusta el comando al binario/imagen real que publique
SonarSource):

```json
{
  "mcpServers": {
    "sonarqube-local": {
      "command": "docker",
      "args": ["run", "-i", "--rm", "-e", "SONARQUBE_URL", "-e", "SONARQUBE_TOKEN", "mcp/sonarqube"],
      "env": {
        "SONARQUBE_URL": "http://host.docker.internal:9002",
        "SONARQUBE_TOKEN": "<tu-token>"
      }
    }
  }
}
```

Notas:
- Desde un contenedor, `localhost` no es el host: usar `host.docker.internal:9002`.
- NO commitear el token en `mcp.json`; preferir variable de entorno del shell.
- Verificar el nombre real de la imagen/paquete del MCP en la doc de SonarSource
  antes de usarlo; el ejemplo es orientativo.

## Estado del último análisis (2026-10-15)

Dashboard `http://localhost:9002/dashboard?id=second-lap-admin`:

- **Bugs: 0** (reliability rating **A**)
- **Vulnerabilidades: 0** (security rating **A**)
- **Code smells: 0** (maintainability rating **A**)
- **Security hotspots: 0**
- **Coverage: 97.1 %** (cargada desde `coverage/lcov.info` de Vitest)
- Duplicación: 1.4 %

Los 12 code smells y 1 hotspot del primer análisis se **corrigieron en código**
(no se desactivaron reglas ni se marcaron como falsos positivos):

- `typescript:S7758` — `String.fromCharCode`/`charCodeAt` → `fromCodePoint`/
  `codePointAt` (`src/lib/nonce.ts`, `src/lib/sessionCookie.ts`).
- `typescript:S7781` — `String#replace(/x/g, …)` → `replaceAll("x", …)`
  (`src/lib/sessionCookie.ts`).
- `typescript:S7755` — `arr[arr.length - 1]` → `arr.at(-1)` (`src/lib/clientKey.ts`).
- `typescript:S1874` — `FormEvent` (deprecado en React 19) → `SyntheticEvent`
  (`src/components/LoginForm.tsx`, `src/components/ProductForm.tsx`).
- `typescript:S5852` (hotspot, ReDoS) — se eliminó el regex `/=+$/` del
  base64url, reemplazado por un helper sin regex (`stripTrailing`) en
  `src/lib/sessionCookie.ts`. El patrón vulnerable ya no existe.

Reanalizar tras cualquier cambio: `pnpm test:coverage && sonar-scanner
-Dsonar.host.url=http://localhost:9002 -Dsonar.token="$SONAR_TOKEN"`.
