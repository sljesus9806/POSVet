/**
 * Runner de la suite de QA (capa A — integración).
 * Corre cada módulo en orden (respetando dependencias), acumula PASA/FALLA en el
 * armazón y redacta docs/resultados-pruebas-<fecha>.md.
 *
 * Uso:  npx tsx --env-file=.env scripts/qa/run-all.ts
 * Requiere BD seedeada y limpia:  npm run db:reset && npm run db:seed
 */
import { writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { getResultados, getBugs, prisma, type Resultado } from "./_harness";

// Orden de ejecución (plan §4). Cada archivo exporta `run(): Promise<void>`.
const MODULOS: Array<{ archivo: string; titulo: string }> = [
  { archivo: "./01-configuracion", titulo: "Configuración" },
  { archivo: "./02-usuarios", titulo: "Usuarios y RBAC" },
  { archivo: "./03-productos", titulo: "Productos y categorías" },
  { archivo: "./04-inventario", titulo: "Inventario" },
  { archivo: "./05-proveedores", titulo: "Proveedores" },
  { archivo: "./06-clientes", titulo: "Clientes" },
  { archivo: "./07-compras", titulo: "Compras" },
  { archivo: "./08-ventas", titulo: "Ventas / POS" },
  { archivo: "./09-cobranza", titulo: "Cobranza" },
  { archivo: "./10-cuentas-pagar", titulo: "Cuentas por pagar" },
  { archivo: "./11-reportes", titulo: "Reportes" },
  { archivo: "./12-dashboard", titulo: "Dashboard" },
  { archivo: "./20-transversales", titulo: "Transversales" },
];

async function main(): Promise<void> {
  console.log("══════════════════════════════════════════════");
  console.log("  Ligerito — Suite de QA (capa A: integración)");
  console.log("══════════════════════════════════════════════");

  for (const m of MODULOS) {
    try {
      const mod = await import(m.archivo);
      if (typeof mod.run === "function") {
        await mod.run();
      } else {
        console.log(`   ⚠️  ${m.archivo} no exporta run()`);
      }
    } catch (err) {
      console.error(`\n💥 ${m.titulo} (${m.archivo}) abortó:`, err);
      // Registramos el crash como FALLA para que quede en el reporte.
      getResultados().push({
        id: m.archivo,
        caso: `Módulo ${m.titulo} lanzó excepción no controlada`,
        estado: "FALLA",
        nota: err instanceof Error ? `${err.name}: ${err.message}` : String(err),
      });
    }
  }

  const resultados = getResultados();
  const bugs = getBugs();
  const pasa = resultados.filter((r) => r.estado === "PASA").length;
  const falla = resultados.filter((r) => r.estado === "FALLA").length;

  console.log("\n══════════════════════════════════════════════");
  console.log(`  RESUMEN: ${pasa} PASA / ${falla} FALLA  (${resultados.length} casos)`);
  console.log(`  Bugs documentados: ${bugs.length}`);
  console.log("══════════════════════════════════════════════");

  escribirReporte(resultados, bugs, pasa, falla);

  await prisma.$disconnect();
  process.exitCode = falla > 0 ? 1 : 0;
}

function escribirReporte(
  resultados: Resultado[],
  bugs: ReturnType<typeof getBugs>,
  pasa: number,
  falla: number,
): void {
  const fecha = new Date().toISOString().slice(0, 10);
  const out: string[] = [];
  out.push(`# Resultados de pruebas funcionales — Ligerito`);
  out.push("");
  out.push(`> Ejecutado: ${new Date().toISOString()}`);
  out.push(`> Capa A (integración, servicios vía index.ts). Guion: docs/plan-pruebas-funcionales.md`);
  out.push("");
  out.push(`## Resumen`);
  out.push("");
  out.push(`- **Casos:** ${resultados.length}`);
  out.push(`- **✅ PASA:** ${pasa}`);
  out.push(`- **❌ FALLA:** ${falla}`);
  out.push(`- **🐛 Bugs documentados:** ${bugs.length}`);
  out.push("");

  // Agrupa por prefijo de ID (CFG, USR, PRD, ...)
  const grupos = new Map<string, Resultado[]>();
  for (const r of resultados) {
    const pref = r.id.split("-")[0] || "OTROS";
    const arr = grupos.get(pref) ?? [];
    arr.push(r);
    grupos.set(pref, arr);
  }

  out.push(`## Detalle por módulo`);
  for (const [pref, arr] of grupos) {
    out.push("");
    out.push(`### ${pref}`);
    out.push("");
    out.push(`| ID | Caso | Resultado | Nota |`);
    out.push(`|----|------|-----------|------|`);
    for (const r of arr) {
      const icono = r.estado === "PASA" ? "✅" : "❌";
      const nota = (r.nota ?? "").replace(/\|/g, "\\|").replace(/\n/g, " ");
      out.push(`| ${r.id} | ${r.caso.replace(/\|/g, "\\|")} | ${icono} | ${nota} |`);
    }
  }

  out.push("");
  out.push(`## Bugs encontrados`);
  out.push("");
  if (bugs.length === 0) {
    out.push(`_Ninguno._`);
  } else {
    for (const b of bugs) {
      out.push(`### [${b.severidad.toUpperCase()}] ${b.titulo}  (${b.id})`);
      out.push("");
      out.push(b.detalle);
      out.push("");
    }
  }

  const ruta = resolve(process.cwd(), `docs/resultados-pruebas-${fecha}.md`);
  writeFileSync(ruta, out.join("\n"), "utf8");
  console.log(`\n📄 Reporte escrito en ${ruta}`);
}

main().catch((err) => {
  console.error("Runner falló:", err);
  process.exit(1);
});
