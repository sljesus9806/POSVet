// Emite y firma una licencia. Corre en TU lado (usa la llave privada).
//
//   npm run lic:emitir -- --cliente "Veterinaria López" --modo offline --meses 12
//
// Opciones:
//   --cliente <texto>   (requerido) negocio licenciado, visible en la UI
//   --modo <online|offline>   default: offline
//   --meses <n>         vigencia en meses. default: offline=12, online=1
//   --gracia <n>        días de tolerancia tras vencer. default: 7
//   --plan <texto>      etiqueta de plan. default: el modo
//
// Imprime el token por stdout y lo guarda en .licencia/emitidas/.

import { randomUUID } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { firmarPayload } from "../../src/lib/modules/licencia/crypto";
import { licenciaPayloadSchema } from "../../src/lib/modules/licencia/schemas";

function arg(nombre: string): string | undefined {
  const i = process.argv.indexOf(`--${nombre}`);
  return i >= 0 ? process.argv[i + 1] : undefined;
}

const cliente = arg("cliente");
if (!cliente) {
  console.error('Falta --cliente "Nombre del negocio".');
  process.exit(1);
}

const modo = (arg("modo") ?? "offline") as "online" | "offline";
if (modo !== "online" && modo !== "offline") {
  console.error('--modo debe ser "online" u "offline".');
  process.exit(1);
}

const meses = Number(arg("meses") ?? (modo === "offline" ? 12 : 1));
const gracia = Number(arg("gracia") ?? 7);
const plan = arg("plan") ?? (modo === "offline" ? "anual" : "mensual");

const PRIV = resolve(process.cwd(), ".licencia", "private.pem");
if (!existsSync(PRIV)) {
  console.error(`No se encontró ${PRIV}. Corre primero: npm run lic:keygen`);
  process.exit(1);
}
const privateKeyPem = readFileSync(PRIV, "utf8");

const ahora = new Date();
const expira = new Date(ahora);
expira.setMonth(expira.getMonth() + meses);

const payload = {
  v: 1 as const,
  licenseId: `lic_${randomUUID().slice(0, 8)}`,
  cliente,
  modo,
  plan,
  emitida: ahora.toISOString(),
  expira: expira.toISOString(),
  gracia,
  features: [] as string[],
};

// Validar antes de firmar para no emitir basura.
const check = licenciaPayloadSchema.safeParse(payload);
if (!check.success) {
  console.error("Payload inválido:", check.error.flatten());
  process.exit(1);
}

const token = firmarPayload(payload, privateKeyPem);

const DIR = resolve(process.cwd(), ".licencia", "emitidas");
mkdirSync(DIR, { recursive: true });
const archivo = resolve(DIR, `${payload.licenseId}.lic`);
writeFileSync(archivo, token);

console.error(
  `Licencia ${payload.licenseId} para "${cliente}" (${modo}, ${plan})\n` +
    `Vence: ${expira.toISOString()}  ·  gracia: ${gracia} días\n` +
    `Guardada en: ${archivo}\n`,
);
// El token va a stdout para poder pipearlo (p.ej. a lic:instalar).
console.log(token);
