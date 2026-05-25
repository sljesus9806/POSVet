import Link from "next/link";
import { notFound } from "next/navigation";
import { Printer } from "lucide-react";
import { ventasService } from "@/lib/modules/ventas";
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
import { CancelarVentaForm } from "./cancelar-venta-form";

const fmt = (n: number) =>
  new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN" }).format(n);

type Params = Promise<{ id: string }>;

export default async function VentaDetallePage({ params }: { params: Params }) {
  await requirePermission("ventas:leer");
  const user = await requireUser();
  const { id } = await params;
  const v = await ventasService.obtenerVenta(id);
  if (!v) notFound();

  const puedeCancelar = hasPermission(user, "ventas:autorizar");

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">
            Venta <span className="font-mono">{v.folio}</span>
            {v.estado === "CANCELADA" && (
              <Badge variant="destructive" className="ml-3 align-middle">Cancelada</Badge>
            )}
          </h2>
          <p className="text-sm text-muted-foreground">
            {v.fechaVenta.toLocaleString("es-MX")} · {v.ubicacionNombre} · caja{" "}
            <span className="font-mono">{v.cajaFolio}</span> · cajero {v.usuarioNombre}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" asChild>
            <Link href="/ventas/historial">Volver</Link>
          </Button>
          <Button variant="outline" asChild>
            <a href={`/ventas/historial/${v.id}/ticket`} target="_blank" rel="noopener">
              <Printer className="size-4" /> Imprimir ticket
            </a>
          </Button>
        </div>
      </div>

      <section className="grid grid-cols-1 md:grid-cols-4 gap-3">
        <Stat label="Subtotal" value={fmt(v.subtotal)} />
        <Stat label="IVA" value={fmt(v.iva)} />
        <Stat label="Descuento global" value={fmt(v.descuentoGlobal)} />
        <Stat label="Total" value={fmt(v.total)} highlight />
      </section>

      <section className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="bg-card border rounded-lg p-4 space-y-1 text-sm">
          <h3 className="font-semibold mb-2">Cliente</h3>
          {v.clienteId ? (
            <>
              <div className="font-medium">
                {v.clienteCodigo} · {v.clienteId ? null : null}
              </div>
              <Link
                href={`/clientes/${v.clienteId}`}
                className="font-medium hover:underline"
              >
                Ver cliente
              </Link>
              <div className="text-muted-foreground">RFC: {v.clienteRfc ?? "—"}</div>
            </>
          ) : (
            <p className="text-muted-foreground">Público en general</p>
          )}
          <div className="pt-2 text-xs text-muted-foreground">
            Tipo de precio aplicado: <Badge variant="secondary">{v.tipoPrecio}</Badge>
          </div>
        </div>

        <div className="bg-card border rounded-lg p-4 space-y-1 text-sm">
          <h3 className="font-semibold mb-2">Pagos</h3>
          {v.pagos.length === 0 ? (
            <p className="text-muted-foreground">Sin pagos.</p>
          ) : (
            <ul className="divide-y">
              {v.pagos.map((p) => (
                <li key={p.id} className="py-2 flex justify-between">
                  <span>
                    {p.forma}
                    {p.referencia && <span className="text-xs text-muted-foreground"> · {p.referencia}</span>}
                  </span>
                  <span className="tabular-nums">{fmt(p.monto)}</span>
                </li>
              ))}
            </ul>
          )}
          <div className="border-t pt-2 space-y-1">
            <div className="flex justify-between text-muted-foreground">
              <span>Recibido</span>
              <span className="tabular-nums">{fmt(v.totalPagado)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Cambio</span>
              <span className="tabular-nums">{fmt(v.cambio)}</span>
            </div>
          </div>
        </div>

        <div className="bg-card border rounded-lg p-4 space-y-2 text-sm">
          <h3 className="font-semibold">Estado</h3>
          {v.estado === "CANCELADA" ? (
            <div className="space-y-1">
              <p>
                <span className="font-medium">Motivo:</span> {v.motivoCancelacion ?? "—"}
              </p>
              <p className="text-muted-foreground text-xs">
                Cancelada por {v.canceladaPorNombre ?? "—"} ·{" "}
                {v.canceladaEn?.toLocaleString("es-MX") ?? "—"}
              </p>
            </div>
          ) : puedeCancelar ? (
            <CancelarVentaForm ventaId={v.id} />
          ) : (
            <p className="text-muted-foreground">
              Solo supervisores/admin pueden cancelar ventas.
            </p>
          )}
        </div>
      </section>

      <section className="space-y-2">
        <h3 className="font-semibold">Líneas</h3>
        <div className="rounded-lg border bg-card overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>SKU</TableHead>
                <TableHead>Producto</TableHead>
                <TableHead className="text-right">Cant.</TableHead>
                <TableHead className="text-right">P. unit.</TableHead>
                <TableHead className="text-right">Desc.</TableHead>
                <TableHead className="text-right">Subtotal</TableHead>
                <TableHead className="text-right">IVA</TableHead>
                <TableHead className="text-right">Total</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {v.lineas.map((l) => (
                <TableRow key={l.id}>
                  <TableCell className="font-mono text-xs">{l.productoSku}</TableCell>
                  <TableCell>
                    <Link href={`/productos/${l.productoId}`} className="hover:underline">
                      {l.productoNombre}
                    </Link>
                    {l.loteNumero && (
                      <span className="text-xs text-muted-foreground ml-2">L:{l.loteNumero}</span>
                    )}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {l.cantidad} {l.unidadMedida}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">{fmt(l.precioUnitario)}</TableCell>
                  <TableCell className="text-right tabular-nums">{fmt(l.descuento)}</TableCell>
                  <TableCell className="text-right tabular-nums">{fmt(l.subtotal)}</TableCell>
                  <TableCell className="text-right tabular-nums">{fmt(l.ivaImporte)}</TableCell>
                  <TableCell className="text-right tabular-nums font-semibold">
                    {fmt(l.total)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </section>

      {v.observaciones && (
        <div className="bg-card border rounded-lg p-4">
          <h3 className="font-semibold mb-1 text-sm">Observaciones</h3>
          <p className="text-sm">{v.observaciones}</p>
        </div>
      )}
    </div>
  );
}

function Stat({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className="bg-card border rounded-lg p-4">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div
        className={`mt-1 tabular-nums font-semibold ${highlight ? "text-2xl" : "text-lg"}`}
      >
        {value}
      </div>
    </div>
  );
}
