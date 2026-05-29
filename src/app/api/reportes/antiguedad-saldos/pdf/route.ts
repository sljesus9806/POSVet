import { requirePermission } from "@/lib/auth-helpers";
import {
  generarReportePDF,
  pdfFmt,
  pdfResponse,
  reportesService,
} from "@/lib/modules/reportes";
import { getEmpresaParaPdf } from "../../_empresa";

export async function GET(req: Request) {
  await requirePermission("reportes:leer");
  const sp = new URL(req.url).searchParams;
  const tipo = sp.get("tipo") === "cxp" ? "cxp" : "cxc";

  const empresa = await getEmpresaParaPdf();

  const reporte =
    tipo === "cxc"
      ? await reportesService.antiguedadSaldosCxC()
      : await reportesService.antiguedadSaldosCxP();

  const filas =
    tipo === "cxc"
      ? (reporte.filas as Awaited<ReturnType<typeof reportesService.antiguedadSaldosCxC>>["filas"]).map(
          (f) => [
            f.clienteCodigo,
            f.clienteNombre,
            { content: String(f.numDocumentos), styles: { halign: "right" as const } },
            { content: pdfFmt.mxn(f.bucket0_30), styles: { halign: "right" as const } },
            { content: pdfFmt.mxn(f.bucket31_60), styles: { halign: "right" as const } },
            { content: pdfFmt.mxn(f.bucket61_90), styles: { halign: "right" as const } },
            { content: pdfFmt.mxn(f.bucketMas90), styles: { halign: "right" as const } },
            { content: pdfFmt.mxn(f.total), styles: { halign: "right" as const } },
          ],
        )
      : (reporte.filas as Awaited<ReturnType<typeof reportesService.antiguedadSaldosCxP>>["filas"]).map(
          (f) => [
            f.proveedorCodigo,
            f.proveedorNombre,
            { content: String(f.numDocumentos), styles: { halign: "right" as const } },
            { content: pdfFmt.mxn(f.bucket0_30), styles: { halign: "right" as const } },
            { content: pdfFmt.mxn(f.bucket31_60), styles: { halign: "right" as const } },
            { content: pdfFmt.mxn(f.bucket61_90), styles: { halign: "right" as const } },
            { content: pdfFmt.mxn(f.bucketMas90), styles: { halign: "right" as const } },
            { content: pdfFmt.mxn(f.total), styles: { halign: "right" as const } },
          ],
        );

  const titulo =
    tipo === "cxc" ? "Antigüedad de saldos — CxC" : "Antigüedad de saldos — CxP";
  const labelEntidad = tipo === "cxc" ? "Cliente" : "Proveedor";

  const buf = generarReportePDF({
    empresa,
    titulo,
    subtitulo: `Corte: ${pdfFmt.fecha(reporte.fechaCorte)}`,
    columnas: [
      { header: "Código" },
      { header: labelEntidad },
      { header: "Docs", align: "right" },
      { header: "0-30", align: "right" },
      { header: "31-60", align: "right" },
      { header: "61-90", align: "right" },
      { header: "+90", align: "right" },
      { header: "Total", align: "right" },
    ],
    filas,
    totales: [
      { label: "Total 0-30 d", valor: pdfFmt.mxn(reporte.totalBucket0_30) },
      { label: "Total 31-60 d", valor: pdfFmt.mxn(reporte.totalBucket31_60) },
      { label: "Total 61-90 d", valor: pdfFmt.mxn(reporte.totalBucket61_90) },
      { label: "Total +90 d", valor: pdfFmt.mxn(reporte.totalBucketMas90) },
      { label: "Total general", valor: pdfFmt.mxn(reporte.totalGeneral) },
    ],
  });

  return pdfResponse(buf, `antiguedad-${tipo}.pdf`);
}
