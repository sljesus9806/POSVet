import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Download, Printer, FileCode } from "lucide-react";
import { facturacionService } from "@/lib/modules/facturacion";
import {
  FORMAS_PAGO,
  METODOS_PAGO,
  MOTIVOS_CANCELACION,
  REGIMENES_FISCALES,
  USOS_CFDI,
} from "@/lib/modules/facturacion/catalogos";
import { requirePermission, hasPermission, requireUser } from "@/lib/auth-helpers";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { CancelarFacturaForm } from "./cancelar-factura-form";

const fmt = (n: number) =>
  new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN" }).format(n);

function lbl(items: { clave: string; descripcion: string }[], clave: string): string {
  return items.find((i) => i.clave === clave)?.descripcion ?? clave;
}

type Params = Promise<{ id: string }>;
type SearchParams = Promise<{ ok?: string }>;

export default async function FacturaDetallePage({
  params,
  searchParams,
}: {
  params: Params;
  searchParams: SearchParams;
}) {
  await requirePermission("facturacion:leer");
  const user = await requireUser();
  const { id } = await params;
  const { ok } = await searchParams;
  const f = await facturacionService.obtener(id);
  if (!f) notFound();

  const puedeCancelar = hasPermission(user, "facturacion:autorizar");

  return (
    <div className="space-y-6">
      <Button variant="outline" size="sm" asChild>
        <Link href="/facturacion">
          <ArrowLeft className="size-4" /> Volver a Facturación
        </Link>
      </Button>

      {ok === "timbrada" && (
        <div className="rounded-md border border-green-600/50 bg-green-600/10 text-green-700 text-sm px-3 py-2">
          ¡Factura generada correctamente! Ya puedes descargar el PDF y el XML para entregárselos
          al cliente.
        </div>
      )}

      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">
            Factura <span className="font-mono">{f.serieFolio}</span>
            {f.estado === "CANCELADA" && (
              <Badge variant="destructive" className="ml-3 align-middle">
                Cancelada
              </Badge>
            )}
            {f.esDemo && (
              <Badge variant="outline" className="ml-2 align-middle">
                demo · sin validez fiscal
              </Badge>
            )}
          </h2>
          <p className="text-sm text-muted-foreground">
            Folio fiscal (UUID): <span className="font-mono">{f.uuid ?? "—"}</span>
          </p>
          <p className="text-sm text-muted-foreground">
            Timbrada el {f.fechaTimbrado?.toLocaleString("es-MX") ?? "—"} · emitió {f.usuarioNombre}
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button variant="outline" asChild>
            <a href={`/facturacion/${f.id}/pdf`} target="_blank" rel="noopener">
              <Printer className="size-4" /> PDF (imprimir)
            </a>
          </Button>
          <Button variant="outline" asChild>
            <a href={`/facturacion/${f.id}/pdf?descargar=1`}>
              <Download className="size-4" /> Descargar PDF
            </a>
          </Button>
          <Button variant="outline" asChild>
            <a href={`/facturacion/${f.id}/xml`}>
              <FileCode className="size-4" /> Descargar XML
            </a>
          </Button>
        </div>
      </div>

      <section className="grid grid-cols-1 md:grid-cols-4 gap-3">
        <Stat label="Subtotal" value={fmt(f.subtotal)} />
        <Stat label="Descuento" value={fmt(f.descuento)} />
        <Stat label="IVA" value={fmt(f.iva)} />
        <Stat label="Total" value={fmt(f.total)} highlight />
      </section>

      <section className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="bg-card border rounded-lg p-4 space-y-1 text-sm">
          <h3 className="font-semibold mb-2">Emisor (tu negocio)</h3>
          <div className="font-medium">{f.emisorNombre}</div>
          <div className="text-muted-foreground">RFC: {f.emisorRfc}</div>
          <div className="text-muted-foreground">Régimen: {f.emisorRegimen}</div>
          <div className="text-muted-foreground">Lugar de expedición: CP {f.lugarExpedicion}</div>
        </div>

        <div className="bg-card border rounded-lg p-4 space-y-1 text-sm">
          <h3 className="font-semibold mb-2">Receptor (cliente)</h3>
          <div className="font-medium">{f.receptorNombre}</div>
          <div className="text-muted-foreground">RFC: {f.receptorRfc}</div>
          <div className="text-muted-foreground">CP: {f.receptorCp}</div>
          <div className="text-muted-foreground">{lbl(REGIMENES_FISCALES, f.receptorRegimen)}</div>
          <div className="text-muted-foreground">Uso: {lbl(USOS_CFDI, f.receptorUsoCfdi)}</div>
        </div>

        <div className="bg-card border rounded-lg p-4 space-y-2 text-sm">
          <h3 className="font-semibold">Pago y venta</h3>
          <div className="text-muted-foreground">{lbl(FORMAS_PAGO, f.formaPago)}</div>
          <div className="text-muted-foreground">{lbl(METODOS_PAGO, f.metodoPago)}</div>
          {f.ventaFolio && (
            <div>
              Venta:{" "}
              <Link href={`/ventas/historial/${f.ventaId}`} className="font-mono hover:underline">
                {f.ventaFolio}
              </Link>
            </div>
          )}
        </div>
      </section>

      <section className="space-y-2">
        <h3 className="font-semibold">Conceptos</h3>
        <div className="rounded-lg border bg-card overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-right">Cant.</TableHead>
                <TableHead>Clave SAT</TableHead>
                <TableHead>Descripción</TableHead>
                <TableHead className="text-right">P. unit.</TableHead>
                <TableHead className="text-right">Desc.</TableHead>
                <TableHead className="text-right">IVA</TableHead>
                <TableHead className="text-right">Importe</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {f.lineas.map((l) => (
                <TableRow key={l.id}>
                  <TableCell className="text-right tabular-nums">{l.cantidad}</TableCell>
                  <TableCell className="font-mono text-xs">{l.claveProdServ}</TableCell>
                  <TableCell>{l.descripcion}</TableCell>
                  <TableCell className="text-right tabular-nums">{fmt(l.valorUnitario)}</TableCell>
                  <TableCell className="text-right tabular-nums">{fmt(l.descuento)}</TableCell>
                  <TableCell className="text-right tabular-nums">{fmt(l.ivaImporte)}</TableCell>
                  <TableCell className="text-right tabular-nums font-semibold">
                    {fmt(l.importe)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </section>

      <section className="bg-card border rounded-lg p-4 space-y-2 text-sm max-w-2xl">
        <h3 className="font-semibold">Estado</h3>
        {f.estado === "CANCELADA" ? (
          <div className="space-y-1">
            <p>
              <span className="font-medium">Cancelada.</span> Motivo:{" "}
              {lbl(MOTIVOS_CANCELACION, f.motivoCancelacion ?? "")}
            </p>
            {f.folioSustitucion && (
              <p className="text-muted-foreground text-xs">
                Sustituye al UUID: <span className="font-mono">{f.folioSustitucion}</span>
              </p>
            )}
            <p className="text-muted-foreground text-xs">
              {f.canceladaPorNombre ?? "—"} · {f.canceladaEn?.toLocaleString("es-MX") ?? "—"}
            </p>
          </div>
        ) : puedeCancelar ? (
          <CancelarFacturaForm facturaId={f.id} />
        ) : (
          <p className="text-muted-foreground">
            Solo un supervisor o administrador puede cancelar facturas.
          </p>
        )}
      </section>
    </div>
  );
}

function Stat({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className="bg-card border rounded-lg p-4">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className={`mt-1 tabular-nums font-semibold ${highlight ? "text-2xl" : "text-lg"}`}>
        {value}
      </div>
    </div>
  );
}
