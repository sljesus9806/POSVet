import { requirePermission } from "@/lib/auth-helpers";
import { reportesService } from "@/lib/modules/reportes";
import { csvResponse, toCsv } from "../../_csv";

export async function GET(req: Request) {
  await requirePermission("reportes:leer");
  const tipo = new URL(req.url).searchParams.get("tipo") === "cxp" ? "cxp" : "cxc";

  const headers = [
    "Código",
    tipo === "cxc" ? "Cliente" : "Proveedor",
    "Docs",
    "0-30",
    "31-60",
    "61-90",
    "+90",
    "Total",
  ];

  let filas: Array<Array<string | number>>;
  if (tipo === "cxc") {
    const r = await reportesService.antiguedadSaldosCxC();
    filas = r.filas.map((f) => [
      f.clienteCodigo,
      f.clienteNombre,
      f.numDocumentos,
      f.bucket0_30,
      f.bucket31_60,
      f.bucket61_90,
      f.bucketMas90,
      f.total,
    ]);
  } else {
    const r = await reportesService.antiguedadSaldosCxP();
    filas = r.filas.map((f) => [
      f.proveedorCodigo,
      f.proveedorNombre,
      f.numDocumentos,
      f.bucket0_30,
      f.bucket31_60,
      f.bucket61_90,
      f.bucketMas90,
      f.total,
    ]);
  }

  return csvResponse(toCsv(headers, filas), `antiguedad-${tipo}.csv`);
}
