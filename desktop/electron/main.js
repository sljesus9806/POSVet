// Proceso principal de Electron del POSVet de escritorio.
// Arranca el stack (Postgres embebido + Next) y abre la ventana apuntando a él.

const { app, BrowserWindow, dialog } = require("electron");
const path = require("node:path");
const fs = require("node:fs");
const crypto = require("node:crypto");

let stopBoot = null;
let ventana = null;

// En dev la app vive en el repo; empaquetada, en resources/app.
function resolverAppRoot() {
  return app.isPackaged
    ? path.join(process.resourcesPath, "app")
    : path.resolve(__dirname, "..", "..");
}

// AUTH_SECRET persistente: se genera una vez y se reutiliza para que las
// sesiones sobrevivan reinicios.
function obtenerAuthSecret() {
  const ruta = path.join(app.getPath("userData"), "auth-secret");
  if (fs.existsSync(ruta)) return fs.readFileSync(ruta, "utf8").trim();
  const secreto = crypto.randomBytes(32).toString("base64");
  fs.writeFileSync(ruta, secreto, { mode: 0o600 });
  return secreto;
}

function ventanaCarga() {
  const win = new BrowserWindow({
    width: 460,
    height: 300,
    resizable: false,
    title: "POSVet",
    webPreferences: { contextIsolation: true },
  });
  win.loadURL(
    "data:text/html;charset=utf-8," +
      encodeURIComponent(`
      <html><body style="font-family:system-ui;display:flex;flex-direction:column;
      align-items:center;justify-content:center;height:100vh;margin:0;background:#0f172a;color:#e2e8f0">
        <h2 style="margin:0 0 8px">POSVet</h2>
        <p style="color:#94a3b8">Iniciando el sistema…</p>
      </body></html>`),
  );
  return win;
}

async function iniciar() {
  // dynamic import porque boot.mjs es ESM y main.js es CJS.
  const { boot } = await import("./boot.mjs");
  const carga = ventanaCarga();

  try {
    const { url, stop } = await boot({
      dataDir: path.join(app.getPath("userData"), "pgdata"),
      authSecret: obtenerAuthSecret(),
      appRoot: resolverAppRoot(),
    });
    stopBoot = stop;

    ventana = new BrowserWindow({
      width: 1280,
      height: 800,
      title: "POSVet",
      show: false,
      webPreferences: { contextIsolation: true },
    });
    await ventana.loadURL(url);
    ventana.maximize();
    ventana.show();
    carga.close();
  } catch (err) {
    carga.close();
    dialog.showErrorBox(
      "No se pudo iniciar POSVet",
      String(err?.stack || err),
    );
    app.quit();
  }
}

app.whenReady().then(iniciar);

app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) iniciar();
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});

// Apaga Postgres y el servidor antes de salir.
app.on("before-quit", async (e) => {
  if (stopBoot) {
    const stop = stopBoot;
    stopBoot = null;
    e.preventDefault();
    await stop();
    app.quit();
  }
});
