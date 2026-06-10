# Ligerito en una sola PC con Windows (la PC es el servidor)

Para el caso **una computadora**: esa misma PC corre el servidor y la persona
entra por **Google Chrome a `http://localhost:3000`** (lo pone en Favoritos).
Sin Docker, sin internet en el día a día, sin ventana de Electron.

> 📄 **Instructivo completo y bonito para imprimir/entregar:**
> [`INSTRUCTIVO-CLIENTE.html`](./INSTRUCTIVO-CLIENTE.html) (ábrelo en Chrome y
> `Ctrl+P` → *Guardar como PDF*). Este README es la versión técnica resumida.

## Archivos de esta carpeta

| Archivo | Para qué |
|---|---|
| `instalar.ps1` | Se corre **una vez** (lo hace quien instala, como Administrador). Idempotente. |
| `iniciar.ps1` | Arranca el servidor. Queda registrado para correr **solo** en cada inicio de sesión. |
| `Instalar.bat` | Doble clic (→ *Ejecutar como administrador*) para lanzar `instalar.ps1`. |
| `respaldar.ps1` / `restaurar.ps1` | Respaldo (pg_dump) y restauración (pg_restore, destructivo) de la BD. |
| `licencia.token` | **Lo pones tú** antes de instalar (ver más abajo). No está versionado. |

---

## Fase 1 — En tu PC de desarrollo (Linux): preparar la licencia

La app tiene **candado de licencia**: sin token instalado, redirige a `/licencia`
y bloquea. El token se firma con la **llave privada**, que **solo vive en tu PC**
(nunca viaja al cliente).

1. Trae lo último de `main` (ya incluye todos los arreglos del instalador Windows):
   ```bash
   cd ~/POSVet && git checkout main && git pull
   ```
2. Verifica que la llave privada empareja con la pública que valida la app
   (`src/lib/modules/licencia/keys.ts`):
   ```bash
   openssl pkey -in .licencia/private.pem -pubout -outform DER | base64 -w0
   # Debe imprimir EXACTAMENTE:
   # MCowBQYDK2VwAyEAsXfC9xDWowQjrKTIltQk4SV6ttc9TRwBKhhO/rlIwlM=
   ```
   Si no coincide, usa la real: `~/posvet-licencias/.licencia/private.pem`.
   **Nunca** corras `lic:keygen` ni cambies `keys.ts` (invalida clientes y tokens).
3. Emite el token offline de larga duración a nombre del negocio:
   ```bash
   npm run lic:emitir -- --cliente "NOMBRE DEL NEGOCIO" --modo offline --meses 120
   ```
4. Copia el token impreso a un archivo `licencia.token` (lo llevarás al cliente):
   ```bash
   cp .licencia/emitidas/$(ls -t .licencia/emitidas/*.lic | head -1 | xargs basename) /tmp/licencia.token
   ```

> **Requisito de Prisma:** la app **debe construirse en Windows** (el motor de la
> BD es por sistema operativo). Por eso el instalador hace el `build` en la PC del
> cliente y no se puede mandar ya compilada desde Linux/Mac.

## Fase 2 — Armar el paquete (USB)

Lleva el código versionado (sin `node_modules`, sin `.licencia`, sin `.env`) y el
token, en dos archivos:

```bash
cd ~/POSVet
git archive --format=zip --output=/tmp/ligerito-cliente.zip main
# Copia al USB:  ligerito-cliente.zip  +  /tmp/licencia.token
```

## Fase 3 — Instalar en la PC del cliente (Windows, una vez)

> ⚠️ **Solo la instalación necesita internet** (baja Node, PostgreSQL y dependencias,
> y construye la app). Una vez instalado, el **uso diario es 100% sin internet**.

1. Descomprime el ZIP en una ruta simple, p. ej. `C:\Ligerito`.
2. Copia tu token a **`C:\Ligerito\deploy\windows\licencia.token`**.
3. Abre **PowerShell como Administrador** y corre:
   ```powershell
   cd C:\Ligerito\deploy\windows
   .\instalar.ps1 -PgSuperPassword "LA_CONTRASEÑA_DE_POSTGRES"
   ```
   *(o clic derecho en `Instalar.bat` → Ejecutar como administrador; pide la
   contraseña oculta.)*
4. Espera unos minutos. El instalador, en orden: instala Node/PostgreSQL si faltan
   → crea la base `posvet` → genera `.env` de producción → `npm ci` → `prisma
   generate` → **migra** → **siembra** → **build** → instala la licencia → deja
   arranque automático + icono en el Escritorio → programa **respaldos cada 30 min**.
5. Al terminar se abre Chrome en `http://localhost:3000`.

### Parámetros de `instalar.ps1`

| Parámetro | Default | Para qué |
|---|---|---|
| `-Puerto` | `3000` | Puerto del servidor (el favorito sería `localhost:<puerto>`). |
| `-PgSuperPassword` | *(pregunta)* | Contraseña del superusuario `postgres`. Si no la pasas, la pide oculta. |
| `-TokenLicencia` | `.\licencia.token` | Ruta al token; por defecto el de esta carpeta. |
| `-RespaldoDestino` | `C:\Ligerito-Respaldos` | Carpeta de respaldos automáticos. |
| `-RespaldoDias` | `7` | Días de retención de respaldos. |

## Fase 4 — Primer arranque

Entra con **`admin@posvet.local` / `admin12345`**, **cambia la contraseña** en
*Usuarios*, y pon el nombre del negocio en *Configuración*. Confirma que **no** te
manda a `/licencia`.

---

## El día a día (para quien lo usa)

- **Prende la compu** → el servidor arranca solo y abre la app.
- Si cierra la ventana: icono **Ligerito** del Escritorio o el favorito
  **`http://localhost:3000`**.
- No tiene que abrir terminales ni nada.

## Mantenimiento

| Necesito… | Cómo |
|---|---|
| **Actualizar** a una versión nueva | Reemplaza los archivos del proyecto y vuelve a correr `Instalar.bat` (conserva BD y `.env`). |
| **Reiniciar** el servidor a mano | Doble clic en `iniciar.ps1`. |
| **Ver errores** | Carpeta `deploy\windows\logs\`. |
| **Cambiar el puerto** | Reinstala con `.\instalar.ps1 -Puerto 8080`. |
| **Facturación real** | Edita `.env` (`FACTURACION_MODO=facturama` + credenciales). Ver `docs/Guia-Facturacion.md`. |
| **Respaldos** | Automáticos cada 30 min (Tarea Programada `Ligerito - Respaldo BD`) → `C:\Ligerito-Respaldos` (`.dump`, retención 7 días, bitácora `respaldos.log`). A mano: `powershell -ExecutionPolicy Bypass -File respaldar.ps1`. |
| **Restaurar** | `powershell -ExecutionPolicy Bypass -File restaurar.ps1 -Archivo "C:\Ligerito-Respaldos\posvet_AAAAMMDD_HHMMSS.dump"` (**destructivo**, pide escribir `SI`). |
| **Cambiar destino/retención** de respaldos | Reinstala con `-RespaldoDestino "D:\Respaldos" -RespaldoDias 14`. |

## Si algo falla

- **Te manda a `/licencia`:** falta o no empareja el token. Re-emite en Linux
  (Fase 1) y, dentro de `C:\Ligerito`, corre
  `npm run lic:instalar -- --archivo deploy\windows\licencia.token`.
- **`password authentication failed`:** la `-PgSuperPassword` no es la real.
- **`P1001 Can't reach database server`:** el instalador reintenta; si persiste,
  confirma el servicio `postgresql*` corriendo en el puerto `5432`.
- **`Unexpected token` en un `.ps1`:** versión vieja; usa el ZIP de `main` actual.
- **`winget` no existe:** instala Node 20+ y PostgreSQL 16+ a mano y reintenta.
- **No abre la página:** revisa `logs\`, confirma PostgreSQL, y corre `iniciar.ps1`.
