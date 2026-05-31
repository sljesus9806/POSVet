// Fuerza una sincronización con la plataforma (salta el throttle). Útil para
// probar el kill-switch: suspende el cliente en el dashboard y corre esto.
//
//   npm run lic:sync
//
// Imprime el resultado y el estado resultante de la licencia.

import { licenciaService, sincronizar } from "../../src/lib/modules/licencia";
import { prisma } from "../../src/lib/modules/shared/db";

async function main() {
  const r = await sincronizar({ force: true });
  console.log("sincronizar ->", JSON.stringify(r));
  const e = await licenciaService.evaluar();
  console.log(`estado -> ${e.estado} | bloqueado: ${e.bloqueado}`);
  console.log(e.mensaje);
}

main()
  .catch((err) => {
    console.error(err instanceof Error ? err.message : err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
