/**
 * Capa B — Smoke web. Hace login (NextAuth credentials + CSRF) y GET a las rutas
 * principales; valida status < 400. Requiere el servidor de dev corriendo:
 *   npm run dev   (en otra terminal)
 *   npx tsx --env-file=.env scripts/qa/30-smoke-web.ts
 *
 * Genera su propio reporte breve por consola (no usa el armazón de capa A).
 */
const BASE = process.env.SMOKE_BASE_URL ?? "http://localhost:3000";
const EMAIL = "admin@posvet.local";
const PASSWORD = "admin12345";

// Jar de cookies muy simple (name=value).
const jar = new Map<string, string>();
function guardarCookies(res: Response) {
  // Node/undici expone getSetCookie()
  const set = (res.headers as unknown as { getSetCookie?: () => string[] }).getSetCookie?.() ?? [];
  for (const c of set) {
    const [pair] = c.split(";");
    const idx = pair.indexOf("=");
    if (idx > 0) jar.set(pair.slice(0, idx).trim(), pair.slice(idx + 1).trim());
  }
}
function cookieHeader() {
  return Array.from(jar.entries()).map(([k, v]) => `${k}=${v}`).join("; ");
}

const RUTAS = [
  "/dashboard",
  "/ventas", "/ventas/cajas", "/ventas/historial",
  "/clientes", "/clientes/nuevo",
  "/cobranza", "/cobranza/abonos", "/cobranza/abonos/nuevo",
  "/productos", "/productos/nuevo", "/productos/categorias",
  "/inventario", "/inventario/ajustes", "/inventario/movimientos",
  "/inventario/transferencias", "/inventario/transferencias/nueva",
  "/proveedores", "/proveedores/nuevo",
  "/compras", "/compras/nueva",
  "/cuentas-pagar", "/cuentas-pagar/facturas/nueva", "/cuentas-pagar/pagos", "/cuentas-pagar/pagos/nuevo",
  "/reportes", "/reportes/ventas-dia", "/reportes/productos-vendidos", "/reportes/ventas-por-usuario",
  "/reportes/inventario-actual", "/reportes/productos-por-caducar", "/reportes/antiguedad-saldos", "/reportes/productos-sin-movimiento",
  "/usuarios", "/usuarios/nuevo",
  "/configuracion",
];

async function login(): Promise<boolean> {
  const csrfRes = await fetch(`${BASE}/api/auth/csrf`);
  guardarCookies(csrfRes);
  const { csrfToken } = (await csrfRes.json()) as { csrfToken: string };

  const body = new URLSearchParams({ csrfToken, email: EMAIL, password: PASSWORD, callbackUrl: `${BASE}/dashboard`, json: "true" });
  const loginRes = await fetch(`${BASE}/api/auth/callback/credentials`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded", cookie: cookieHeader() },
    body,
    redirect: "manual",
  });
  guardarCookies(loginRes);
  return Array.from(jar.keys()).some((k) => k.includes("session-token"));
}

async function main() {
  console.log(`\n== Capa B — Smoke web contra ${BASE} ==`);
  let server = true;
  try { await fetch(`${BASE}/api/auth/csrf`); } catch { server = false; }
  if (!server) {
    console.log("⚠️  Servidor no disponible. Arranca `npm run dev` y reintenta. (Capa B omitida)");
    process.exit(0);
  }

  const logueado = await login();
  console.log(logueado ? "✅ Login OK (cookie de sesión presente)" : "❌ Login falló (sin cookie de sesión)");

  let pasa = 0, falla = 0;
  for (const ruta of RUTAS) {
    try {
      const res = await fetch(`${BASE}${ruta}`, { headers: { cookie: cookieHeader() }, redirect: "manual" });
      // <400 OK; 3xx a /login indica sesión no válida → se cuenta como fallo
      const ok = res.status < 400;
      const aLogin = res.status >= 300 && res.status < 400 && (res.headers.get("location") ?? "").includes("/login");
      if (ok && !aLogin) { pasa++; console.log(`  ✅ ${res.status} ${ruta}`); }
      else { falla++; console.log(`  ❌ ${res.status}${aLogin ? " →/login" : ""} ${ruta}`); }
    } catch (e) {
      falla++; console.log(`  ❌ ERROR ${ruta}: ${e instanceof Error ? e.message : e}`);
    }
  }
  console.log(`\nResumen smoke web: ${pasa} OK / ${falla} fallo (${RUTAS.length} rutas)`);
  process.exitCode = falla > 0 ? 1 : 0;
}

main().catch((e) => { console.error("Smoke web falló:", e); process.exit(1); });
