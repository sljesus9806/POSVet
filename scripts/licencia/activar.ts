// Activa el modo online de ESTA copia contra la plataforma de licencias.
//
//   npm run lic:activar -- --url http://localhost:3000 --clave <claveActivacion>
//
// Contacta /api/v1/activar, instala el token devuelto y guarda url+clave para
// que Ligerito renueve solo de ahí en adelante. La clave se obtiene de la ficha
// del cliente en el dashboard de la plataforma.

import { hostname } from "node:os";
import { activarOnline } from "../../src/lib/modules/licencia";
import { prisma } from "../../src/lib/modules/shared/db";

function arg(nombre: string): string | undefined {
  const i = process.argv.indexOf(`--${nombre}`);
  return i >= 0 ? process.argv[i + 1] : undefined;
}

async function main() {
  const url = arg("url");
  const clave = arg("clave");
  if (!url || !clave) {
    console.error("Uso: npm run lic:activar -- --url <URL> --clave <CLAVE>");
    process.exit(1);
  }
  const instalacion = arg("instalacion") ?? hostname();
  await activarOnline({ apiUrl: url, clave, instalacion });
  console.log(`Activado online contra ${url} (instalación: ${instalacion}).`);
}

main()
  .catch((err) => {
    console.error(err instanceof Error ? err.message : err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
