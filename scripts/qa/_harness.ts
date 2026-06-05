/**
 * Armazón de la suite de QA (capa A — integración).
 * Provee: prisma compartido, fixtures del seed, helpers de aserción y un
 * registro de resultados que run-all.ts agrega para el reporte final.
 *
 * No depende de Next.js: importa los servicios por su index.ts (API pública).
 */
import { prisma } from "../../src/lib/modules/shared/db";

// ---------------------------------------------------------------------------
// Registro de resultados
// ---------------------------------------------------------------------------
export type Estado = "PASA" | "FALLA";

export type Resultado = {
  id: string;
  caso: string;
  estado: Estado;
  nota?: string;
};

export type Bug = {
  id: string; // caso que lo destapó
  severidad: "alta" | "media" | "baja";
  titulo: string;
  detalle: string;
};

const resultados: Resultado[] = [];
const bugs: Bug[] = [];

/**
 * Estado compartido entre módulos (IDs creados por un caso y usados por otro).
 * Funciona porque run-all.ts importa todos los scripts en un solo proceso
 * (singleton de módulo ESM). tsx transpila sin chequear tipos, así que `any` es seguro aquí.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const S: Record<string, any> = {};

export function getResultados(): Resultado[] {
  return resultados;
}
export function getBugs(): Bug[] {
  return bugs;
}

export function reportarBug(b: Bug): void {
  bugs.push(b);
  console.log(`   🐛 BUG[${b.severidad}] ${b.id}: ${b.titulo}`);
}

// ---------------------------------------------------------------------------
// Aserciones — registran PASA/FALLA sin abortar todo el módulo
// ---------------------------------------------------------------------------
let casoActual = "";
let descActual = "";

/** Marca el caso en curso (para que ok()/check() lo etiqueten). */
export function caso(id: string, descripcion: string): void {
  casoActual = id;
  descActual = descripcion;
}

function registrar(estado: Estado, nota?: string): void {
  resultados.push({ id: casoActual, caso: descActual, estado, nota });
  const icono = estado === "PASA" ? "✅" : "❌";
  console.log(`   ${icono} ${casoActual} ${descActual}${nota ? ` — ${nota}` : ""}`);
}

/** Aserción booleana. */
export function check(cond: boolean, nota?: string): boolean {
  registrar(cond ? "PASA" : "FALLA", nota);
  return cond;
}

/** Igualdad (con tolerancia para números — dinero). */
export function eq(actual: unknown, esperado: unknown, nota?: string): boolean {
  let cond: boolean;
  if (typeof actual === "number" && typeof esperado === "number") {
    cond = Math.abs(actual - esperado) < 0.005;
  } else {
    cond = actual === esperado;
  }
  const detalle = cond ? nota : `${nota ?? ""} (esperado ${esperado}, fue ${actual})`;
  registrar(cond ? "PASA" : "FALLA", detalle);
  return cond;
}

/** Espera que `fn` lance un error cuyo name/constructor coincida con `nombreError`. */
export async function lanza(
  nombreError: string,
  fn: () => Promise<unknown>,
  nota?: string,
): Promise<boolean> {
  try {
    await fn();
    registrar("FALLA", `${nota ?? ""} (no lanzó; se esperaba ${nombreError})`);
    return false;
  } catch (err) {
    const name = err instanceof Error ? err.name : String(err);
    const cond = name === nombreError;
    registrar(
      cond ? "PASA" : "FALLA",
      cond ? nota : `${nota ?? ""} (lanzó ${name}, se esperaba ${nombreError})`,
    );
    return cond;
  }
}

/** Igual que lanza() pero acepta cualquiera de varios nombres de error. */
export async function lanzaAlguno(
  nombres: string[],
  fn: () => Promise<unknown>,
  nota?: string,
): Promise<boolean> {
  try {
    await fn();
    registrar("FALLA", `${nota ?? ""} (no lanzó; se esperaba ${nombres.join("|")})`);
    return false;
  } catch (err) {
    const name = err instanceof Error ? err.name : String(err);
    const cond = nombres.includes(name);
    registrar(
      cond ? "PASA" : "FALLA",
      cond ? nota : `${nota ?? ""} (lanzó ${name}, se esperaba ${nombres.join("|")})`,
    );
    return cond;
  }
}

/** Convierte Prisma.Decimal | number | string a number. */
export function num(v: unknown): number {
  if (v == null) return 0;
  if (typeof v === "number") return v;
  // Prisma.Decimal tiene toNumber(); strings parsean directo.
  const anyV = v as { toNumber?: () => number };
  if (typeof anyV.toNumber === "function") return anyV.toNumber();
  return Number(v);
}

export function r2(n: number): number {
  return Math.round(n * 100) / 100;
}

// ---------------------------------------------------------------------------
// Fixtures del seed (IDs fijos definidos en prisma/seed.ts)
// ---------------------------------------------------------------------------
export const SEED = {
  empresaId: "empresa-default",
  ubicacionTienda: "ubicacion-tienda",
  ubicacionBodega: "ubicacion-bodega",
  adminEmail: "admin@posvet.local",
  adminPassword: "admin12345",
  skus: {
    amox: "MED-AMOX-500",
    iver: "MED-IVER-10",
    canino: "ABA-ATUN-24",
    felino: "ABA-CAFE-1K",
    collar: "LIM-JAB-3",
  },
} as const;

/** Resuelve el id del admin (sembrado por email, id es cuid). */
export async function adminId(): Promise<string> {
  const u = await prisma.usuario.findUnique({ where: { email: SEED.adminEmail } });
  if (!u) throw new Error("Admin del seed no encontrado — ¿corriste db:seed?");
  return u.id;
}

/** Helper para obtener el id de un producto del seed por SKU. */
export async function productoIdPorSku(sku: string): Promise<string> {
  const p = await prisma.producto.findUnique({ where: { sku } });
  if (!p) throw new Error(`Producto ${sku} no encontrado`);
  return p.id;
}

/** Stock actual de un producto en una ubicación (number). */
export async function stock(productoId: string, ubicacionId: string): Promise<number> {
  const inv = await prisma.inventario.findUnique({
    where: { productoId_ubicacionId: { productoId, ubicacionId } },
  });
  return inv ? num(inv.stock) : 0;
}

export { prisma };
