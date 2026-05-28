import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { comprasService } from "@/lib/modules/compras";
import { requirePermission } from "@/lib/auth-helpers";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { OcAcciones } from "./oc-acciones";
import { RecepcionForm } from "./recepcion-form";

type SearchParams = Promise<{ ok?: string }>;

const ESTADO_VARIANT: Record<string, "default" | "outline" | "secondary" | "destructive"> = {
  BORRADOR: "outline",
  ENVIADA: "secondary",
  RECIBIDA_PARCIAL: "secondary",
  RECIBIDA_TOTAL: "default",
  CANCELADA: "destructive",
};

const ESTADO_LABEL: Record<string, string> = {
  BORRADOR: "Borrador",
  ENVIADA: "Enviada",
  RECIBIDA_PARCIAL: "Recibida parcial",
  RECIBIDA_TOTAL: "Recibida total",
  CANCELADA: "Cancelada",
};

function fmtFecha(d: Date | null | undefined) {
  if (!d) return "—";
  return new Intl.DateTimeFormat("es-MX", { dateStyle: "medium", timeStyle: "short" }).format(d);
}

function fmtFechaCorta(d: Date | null | undefined) {
  if (!d) return "—";
  return new Intl.DateTimeFormat("es-MX", { dateStyle: "medium" }).format(d);
}

function fmtMoneda(n: number) {
  return new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN" }).format(n);
}

export default async function OrdenCompraDetallePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: SearchParams;
}) {
  await requirePermission("compras:leer");
  const { id } = await params;
  const sp = await searchParams;
  const oc = await comprasService.obtenerOrden(id);
  if (!oc) notFound();

  const totalPendiente = oc.lineas.reduce((acc, l) => acc + l.cantidadPendiente, 0);
  const puedeEnviar = oc.estado === "BORRADOR";
  const puedeCancelar = oc.estado === "BORRADOR" || oc.estado === "ENVIADA";
  const puedeRecibir = oc.estado === "ENVIADA" || oc.estado === "RECIBIDA_PARCIAL";

  return (
    <div className="space-y-6 max-w-6xl">
      <div>
        <Button variant="ghost" size="sm" asChild className="-ml-2">
          <Link href="/compras">
            <ArrowLeft className="size-4" /> Volver a compras
          </Link>
        </Button>
        <div className="flex items-center gap-3 mt-1 flex-wrap">
          <h2 className="text-2xl font-semibold tracking-tight">{oc.folio}</h2>
          <Badge variant={ESTADO_VARIANT[oc.estado] ?? "outline"}>
            {ESTADO_LABEL[oc.estado] ?? oc.estado}
          </Badge>
        </div>
        <p className="text-xs text-muted-foreground mt-1">
          Creada {fmtFecha(oc.createdAt)} por {oc.usuarioNombre}
          {oc.enviadaEn && ` · enviada ${fmtFecha(oc.enviadaEn)}`}
          {oc.cerradaEn && ` · cerrada ${fmtFecha(oc.cerradaEn)}`}
          {oc.canceladaEn && ` · cancelada ${fmtFecha(oc.canceladaEn)}`}
        </p>
      </div>

      {sp.ok === "creada" && (
        <div className="rounded-md border border-green-600/50 bg-green-600/10 text-green-700 text-sm px-3 py-2">
          OC creada en borrador. Cuando estés listo, envíala al proveedor con &ldquo;Marcar como enviada&rdquo;.
        </div>
      )}

      <section className="rounded-lg border bg-card p-5 grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
        <div>
          <div className="text-xs text-muted-foreground">Proveedor</div>
          <div className="font-medium">{oc.proveedorNombre}</div>
        </div>
        <div>
          <div className="text-xs text-muted-foreground">Ubicación destino</div>
          <div className="font-medium">{oc.ubicacionDestinoNombre}</div>
        </div>
        <div>
          <div className="text-xs text-muted-foreground">Fecha esperada</div>
          <div className="font-medium">{fmtFechaCorta(oc.fechaEsperada)}</div>
        </div>
        {oc.observaciones && (
          <div className="sm:col-span-3">
            <div className="text-xs text-muted-foreground">Observaciones</div>
            <div>{oc.observaciones}</div>
          </div>
        )}
        {oc.motivoCancelacion && (
          <div className="sm:col-span-3">
            <div className="text-xs text-muted-foreground">Motivo de cancelación</div>
            <div className="text-destructive">{oc.motivoCancelacion}</div>
          </div>
        )}
      </section>

      <section className="rounded-lg border bg-card">
        <div className="flex items-center justify-between p-4 border-b">
          <h3 className="font-semibold">Líneas</h3>
          <div className="text-sm text-muted-foreground">
            Pendiente por recibir:{" "}
            <span className="font-medium text-foreground">{totalPendiente.toFixed(3)}</span>
          </div>
        </div>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>SKU</TableHead>
                <TableHead>Producto</TableHead>
                <TableHead className="text-right">Solicitada</TableHead>
                <TableHead className="text-right">Recibida</TableHead>
                <TableHead className="text-right">Pendiente</TableHead>
                <TableHead className="text-right">Costo</TableHead>
                <TableHead className="text-right">Total</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {oc.lineas.map((l) => (
                <TableRow key={l.id}>
                  <TableCell className="font-mono text-xs">{l.productoSku}</TableCell>
                  <TableCell>
                    <div className="font-medium text-sm">{l.productoNombre}</div>
                    <div className="text-xs text-muted-foreground">
                      {l.unidadMedida}
                      {l.codigoProveedor && ` · prov: ${l.codigoProveedor}`}
                    </div>
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {l.cantidadSolicitada.toFixed(3)}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {l.cantidadRecibida.toFixed(3)}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {l.cantidadPendiente > 0 ? (
                      <span className="text-foreground">{l.cantidadPendiente.toFixed(3)}</span>
                    ) : (
                      <span className="text-muted-foreground">0.000</span>
                    )}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {fmtMoneda(l.costoUnitario)}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">{fmtMoneda(l.total)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
        <div className="border-t p-4 flex justify-end">
          <div className="text-sm tabular-nums space-y-1 min-w-[220px]">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Subtotal</span>
              <span>{fmtMoneda(oc.subtotal)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">IVA</span>
              <span>{fmtMoneda(oc.iva)}</span>
            </div>
            <div className="flex justify-between font-semibold border-t pt-1">
              <span>Total</span>
              <span>{fmtMoneda(oc.total)}</span>
            </div>
          </div>
        </div>
      </section>

      <OcAcciones
        ordenCompraId={oc.id}
        folio={oc.folio}
        puedeEnviar={puedeEnviar}
        puedeCancelar={puedeCancelar}
      />

      {puedeRecibir && (
        <RecepcionForm
          ordenCompraId={oc.id}
          lineas={oc.lineas
            .filter((l) => l.cantidadPendiente > 0)
            .map((l) => ({
              id: l.id,
              productoNombre: l.productoNombre,
              productoSku: l.productoSku,
              unidadMedida: l.unidadMedida,
              pendiente: l.cantidadPendiente,
              costoUnitario: l.costoUnitario,
            }))}
        />
      )}

      <section className="rounded-lg border bg-card">
        <div className="p-4 border-b">
          <h3 className="font-semibold">Recepciones registradas</h3>
        </div>
        {oc.recepciones.length === 0 ? (
          <p className="text-sm text-muted-foreground p-6 text-center">
            Aún no hay recepciones para esta OC.
          </p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Folio</TableHead>
                <TableHead>Fecha</TableHead>
                <TableHead>Usuario</TableHead>
                <TableHead className="text-right">Líneas</TableHead>
                <TableHead>Observaciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {oc.recepciones.map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="font-mono text-xs">{r.folio}</TableCell>
                  <TableCell className="text-sm">{fmtFecha(r.fecha)}</TableCell>
                  <TableCell className="text-sm">{r.usuarioNombre}</TableCell>
                  <TableCell className="text-right tabular-nums">{r.totalLineas}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {r.observaciones ?? "—"}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </section>
    </div>
  );
}
