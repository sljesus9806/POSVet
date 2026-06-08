# Ligerito en una sola PC con Windows (la PC es el servidor)

Para el caso **una computadora**: esa misma PC corre el servidor y la persona
entra por **Google Chrome a `http://localhost:3000`** (lo pone en Favoritos).
Sin Docker, sin internet, sin ventana de Electron.

- `instalar.ps1` — se corre **una vez** (lo hace quien instala).
- `iniciar.ps1` — arranca el servidor; queda registrado para correr **solo** cada
  vez que se inicia sesión en Windows.
- `Instalar.bat` — doble clic para lanzar `instalar.ps1`.

---

## Antes de empezar (en TU PC de desarrollo)

La app tiene candado de licencia: **sin licencia, no deja entrar**. Genera una
licencia offline de larga duración (necesitas la llave privada, que solo está en
tu PC):

```bash
npm run lic:emitir -- --cliente "Nombre del negocio" --modo offline --meses 120
```

Copia el token que imprime a un archivo llamado **`licencia.token`** dentro de
esta carpeta (`deploy/windows/licencia.token`) antes de instalar en la PC del
cliente. (Si no lo pones, el instalador te avisa y la app quedará bloqueada.)

> Requisito de Prisma: la app **debe construirse en Windows** (el motor de la BD
> es por sistema operativo). Por eso el instalador hace el `build` en la PC del
> cliente y no se puede mandar ya compilada desde Linux/Mac.

---

## Instalar en la PC del cliente (una vez)

> ⚠️ **Solo la instalación necesita internet** (para bajar Node, PostgreSQL y las
> dependencias, y construir la app). Una vez instalado, el **uso diario es 100%
> sin internet**.

1. Copia **toda la carpeta del proyecto** a la PC (por ejemplo a `C:\Ligerito`).
   Asegúrate de incluir `deploy/windows/licencia.token`.
2. Requisitos que el instalador intenta poner solo (vía `winget`): **Node 20+** y
   **PostgreSQL**. En Windows 10/11 `winget` ya viene incluido.
3. Entra a `deploy\windows` y **clic derecho en `Instalar.bat` → Ejecutar como
   administrador** (administrador para que pueda instalar Node/PostgreSQL).
4. Cuando pida la **contraseña de `postgres`**, escribe la que pusiste al
   instalar PostgreSQL (o la que defina el asistente).
5. Al terminar, el servidor arranca y se abre Chrome en `http://localhost:3000`.

Entra con **`admin@posvet.local` / `admin12345`** y cambia la contraseña en
**Usuarios**.

---

## El día a día (para la persona que lo usa)

- **Prende la compu** → el servidor arranca solo y abre la app.
- Si la cierra, abre Chrome y entra a su favorito **`http://localhost:3000`**.
- No tiene que abrir terminales ni nada.

Sugerencia: deja `http://localhost:3000` en **Favoritos de Chrome** y/o usa el
icono **Ligerito** que el instalador deja en el Escritorio.

---

## Mantenimiento

| Necesito… | Cómo |
|---|---|
| **Actualizar** a una versión nueva del código | Reemplaza los archivos del proyecto y vuelve a correr `Instalar.bat` (conserva la BD y el `.env`). |
| **Arrancar/Reiniciar** el servidor a mano | Doble clic en `iniciar.ps1` (o `powershell -ExecutionPolicy Bypass -File iniciar.ps1`). |
| **Ver errores** | Carpeta `deploy\windows\logs\`. |
| **Cambiar el puerto** | `Instalar.bat -Puerto 8080` (y el favorito sería `localhost:8080`). |
| **Activar facturación real** | Edita `.env` (`FACTURACION_MODO=facturama` + credenciales). Ver `docs/Guia-Facturacion.md`. |
| **Respaldos** | La BD vive en PostgreSQL local; programa un respaldo con `pg_dump` (ver `deploy/README.md`). |

---

## Si algo falla

- **Te manda a la pantalla de licencia:** falta instalar el token. Corre en la
  carpeta del proyecto: `npm run lic:instalar -- --archivo deploy\windows\licencia.token`.
- **No abre la página / `localhost` no responde:** revisa `logs\`, confirma que
  el servicio de PostgreSQL esté corriendo (Servicios de Windows → `postgresql`),
  y vuelve a correr `iniciar.ps1`.
- **`winget` no existe:** instala manualmente Node 20+ (nodejs.org) y PostgreSQL
  (postgresql.org), luego corre `Instalar.bat`.
