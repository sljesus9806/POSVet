# Instalación de POSVet

POSVet se instala de **dos formas**, según el cliente:

| | 🖥️ Escritorio | ☁️ Nube |
|---|---|---|
| **Para quién** | Cliente de **una sola PC/ubicación** | Cliente con **varias ubicaciones** o que entra desde cualquier lado |
| **Dónde viven los datos** | En la PC del cliente (Postgres embebido) | En tu servidor/PC |
| **Cómo entra** | App instalada (ventana propia) | Navegador (Chrome) |
| **Internet** | No necesita | Sí (para acceso remoto del cliente) |
| **Docker** | No | Sí |

---

## 🖥️ Forma 1 — Escritorio (instalador `.exe` para Windows)

Construyes el instalador **una vez** (en una PC con Windows) y ese `.exe` lo
instalas en cuantas PCs quieras. No necesita Docker.

### Construir el instalador (en Windows)

Requisitos: Node 20+ y el repo POSVet.

```bash
# en la raíz del repo
npm ci
npm run build              # genera el servidor empaquetado (.next/standalone)

cd desktop
npm install                # electron, postgres embebido, empaquetador
npm run build:app          # acomoda los archivos del servidor
npm run dist               # construye el instalador
# → desktop/dist/POSVet Setup <version>.exe
```

> El `.exe` de Windows **debe construirse en Windows** (los binarios del Postgres
> embebido y el instalador NSIS son por sistema operativo).

### Instalar en la PC del cliente

1. Copia `POSVet Setup <version>.exe` y ejecútalo.
2. Al primer arranque, la app sola: crea su base de datos (en `%APPDATA%/POSVet`),
   aplica migraciones, siembra datos iniciales y abre la ventana.
3. Entra con `admin@posvet.local` / `admin12345` y configura empresa/usuarios.

### Probar en Linux (dev, sin generar `.exe`)

```bash
cd desktop && npm install
npm run desktop:dev        # abre la ventana de Electron
# o:
npm run boot-test          # verifica el arranque sin ventana (headless)
```

Detalles técnicos del empaquetado: ver [`desktop/README.md`](../desktop/README.md).

---

## ☁️ Forma 2 — Nube (POS en el navegador, multi-cliente)

Una instancia de POSVet por cliente (cada una con su BD), detrás de un proxy que
enruta por subdominio.

### Preparar el servidor (una vez)

```bash
cd POSVet

# 1. construir la imagen de POSVet (repetir al actualizar el código)
bash deploy/build-image.sh          # o: docker build -t posvet:latest .

# 2. levantar el stack base (Traefik + Postgres compartido)
cd deploy && docker compose up -d && cd ..
```

### Crear un cliente — Opción A: por comando

```bash
node deploy/provisionar.mjs serengueti --nombre "Tienda Serengueti"
# → http://serengueti.localhost   (admin@posvet.local / admin12345)
```

### Crear un cliente — Opción B: botón en el panel de licencias

```bash
cd posvet-licencias && npm run dev        # → http://localhost:3000
```

Entra al panel → **Generar POS** → escribe el nombre → listo. Crea el cliente,
registra su licencia y aprovisiona el POS. La ficha muestra *"Provisionando…"* →
recarga → *"Activo"* con el enlace.

### Administrar

```bash
# dar de baja un cliente (con --purge borra también su BD)
node deploy/desprovisionar.mjs <slug> [--purge]
```

- **Actualizar el POS** tras cambiar código: reconstruir imagen + re-provisionar.
- Detalles: ver [`deploy/README.md`](../deploy/README.md).

> **Nota sobre localhost:** `*.localhost` solo es visible **en tu PC** (para
> pruebas/demo). Para que el cliente entre desde sus locales hace falta sacar el
> POS a internet (túnel Cloudflare o VPS + dominio) — ver `deploy/README.md`.
