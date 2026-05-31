# POSVet — Empaquetado de escritorio

Convierte POSVet en una app instalable (`.exe`) que corre **sin Docker**: trae un
**Postgres embebido** y el servidor Next dentro de una ventana Electron.

## Cómo funciona

Al abrir la app, `electron/main.js` ejecuta la secuencia de `electron/boot.mjs`:

1. Arranca un **Postgres embebido** con datos en la carpeta del usuario
   (`%APPDATA%/POSVet/pgdata` en Windows). Persiste entre sesiones.
2. Aplica las **migraciones** (`prisma/migrations/*/migration.sql`) directamente,
   sin la CLI de Prisma, registrando las aplicadas para ser idempotente.
3. En la **primera corrida** siembra roles, permisos y el admin inicial.
4. Arranca el **servidor Next standalone** apuntando a esa BD.
5. Abre la ventana en `http://127.0.0.1:<puerto-libre>`.

Verificado headless en Linux: `npm run boot-test` (arranca todo y comprueba que
la BD y el servidor responden). También probada la persistencia entre reinicios.

## Requisitos del repo

`next.config.ts` usa `output: "standalone"`. La licencia funciona en modo
**offline** (sin la plataforma) o **online** según se configure.

## Desarrollo (sobre el repo, sin empaquetar)

```bash
cd ..                       # raíz del repo
npm run build               # genera .next/standalone
cd desktop
npm install                 # electron, embedded-postgres, etc.
npm run build:app           # copia static/public dentro del standalone
npm run desktop:dev         # abre la ventana de Electron contra el repo
```

## Generar el instalador de Windows (.exe)

> **Debe hacerse en una máquina Windows** (o CI con runner Windows): los binarios
> de Postgres embebido y el instalador NSIS son específicos del SO. Al hacer
> `npm install` en Windows se baja `@embedded-postgres/windows-x64`
> automáticamente.

```bash
# en Windows, dentro de la raíz del repo:
npm ci && npm run build              # construye la app (standalone)
cd desktop
npm ci                               # instala deps + binarios Windows de PG
npm run build:app                    # prepara el standalone
npm run dist                         # compila el seed + electron-builder --win
# salida: desktop/dist/POSVet Setup <version>.exe
```

### Qué se empaqueta (`electron-builder.yml`)

- `electron/**` + `node_modules` del desktop (incluye `embedded-postgres`).
- Como recursos (`resources/app`): `.next/standalone` (servidor + estáticos),
  `prisma/` (migraciones + `seed.mjs` compilado).
- Los binarios nativos de `@embedded-postgres` se desempacan (`asarUnpack`).

## Pendientes / notas

- **Ícono:** agregar `build/icon.ico` y descomentar `win.icon` en el yml.
- **Firma de código:** sin firmar, Windows mostrará SmartScreen. Para distribuir
  sin advertencias hace falta un certificado de firma.
- **Seed compilado:** `npm run build:seed` genera `prisma/seed.mjs` con esbuild
  (en dev se usa `tsx` sobre `seed.ts`). El seed siembra productos demo; para una
  instalación de cliente quizá quieras una variante sin datos de ejemplo.
- **Licencia:** definir si el instalador trae el modo online preconfigurado
  (URL de la plataforma) o si se activa con `lic:activar` tras instalar.
