import Link from "next/link";
import { notFound } from "next/navigation";
import { ventasService } from "@/lib/modules/ventas";
import { requirePermission } from "@/lib/auth-helpers";
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
import { CerrarCajaForm } from "./cerrar-caja-form";

const fmt = (n: number) =>
  new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN" }).format(n);

type Params = Promise<{ id: string }>;

export default async function CajaDetallePage({ params }: { params: Params }) {
  await requirePermission("cajas:leer");
  const { id } = await params;
  const caja = await ventasService.obtenerCaja(id);
  if (!caja) notFound();

  const ventas = await ventasService.listarVentas({ cajaId: caja.id, limit: 200 });
  const efectivoVendido = caja.desglosePorForma.find((d) => d.forma === "EFECTIVO")?.total ?? 0;
  // El cambio entregado sale del cajón (efectivo): se resta del esperado.
  const cambioTotal = caja.cambioTotal;
  const esperado = caja.fondoInicial + efectivoVendido - cambioTotal;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">
            Caja <span className="font-mono">{caja.folio}</span>
          </h2>
          <p className="text-sm text-muted-foreground">
            {caja.ubicacionNombre} · abierta por {caja.abiertaPorNombre} ·{" "}
            {caja.abiertaEn.toLocaleString("es-MX")}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" asChild>
            <Link href="/ventas/cajas">Volver</Link>
          </Button>
          {caja.estado === "ABIERTA" && (
            <Button variant="outline" asChild>
              <Link href="/ventas">Vender</Link>
            </Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
        <Stat label="Estado" value={caja.estado === "ABIERTA" ? "Abierta" : "Cerrada"} />
        <Stat label="Fondo inicial" value={fmt(caja.fondoInicial)} />
        <Stat label="Total vendido" value={fmt(caja.totalVendido)} />
        <Stat label="Tickets" value={String(caja.totalVentas)} />
      </div>

      <section className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-card border rounded-lg p-4 space-y-3">
          <h3 className="font-semibold">Desglose por forma de pago</h3>
          {caja.desglosePorForma.length === 0 ? (
            <p className="text-sm text-muted-foreground">Sin pagos registrados.</p>
          ) : (
            <ul className="text-sm divide-y">
              {caja.desglosePorForma.map((d) => (
                <li key={d.forma} className="py-2 flex justify-between">
                  <span>{d.forma}</span>
                  <span className="tabular-nums">{fmt(d.total)}</span>
                </li>
              ))}
            </ul>
          )}
          <div className="border-t pt-2 text-sm space-y-1">
            {cambioTotal > 0 && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Cambio entregado</span>
                <span className="tabular-nums">− {fmt(cambioTotal)}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-muted-foreground">Efectivo esperado en caja</span>
              <span className="tabular-nums font-semibold">{fmt(esperado)}</span>
            </div>
            {caja.estado === "CERRADA" && (
              <>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Contado</span>
                  <span className="tabular-nums">{fmt(caja.montoContadoEfectivo ?? 0)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Diferencia</span>
                  <span
                    className={`tabular-nums font-semibold ${
                      (caja.diferenciaEfectivo ?? 0) === 0
                        ? ""
                        : (caja.diferenciaEfectivo ?? 0) > 0
                          ? "text-green-600"
                          : "text-destructive"
                    }`}
                  >
                    {fmt(caja.diferenciaEfectivo ?? 0)}
                  </span>
                </div>
              </>
            )}
          </div>
        </div>

        {caja.estado === "ABIERTA" ? (
          <CerrarCajaForm cajaId={caja.id} montoEsperadoEfectivo={esperado} />
        ) : (
          <div className="bg-card border rounded-lg p-4 space-y-2">
            <h3 className="font-semibold">Cierre</h3>
            <p className="text-sm text-muted-foreground">
              Cerrada por {caja.cerradaPorNombre ?? "—"} ·{" "}
              {caja.cerradaEn ? caja.cerradaEn.toLocaleString("es-MX") : "—"}
            </p>
            {caja.observacionesCierre && (
              <p className="text-sm">{caja.observacionesCierre}</p>
            )}
          </div>
        )}
      </section>

      <section className="space-y-2">
        <h3 className="font-semibold">Ventas de la caja</h3>
        <div className="rounded-lg border bg-card overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Folio</TableHead>
                <TableHead>Fecha</TableHead>
                <TableHead>Cliente</TableHead>
                <TableHead className="text-right">Líneas</TableHead>
                <TableHead className="text-right">Total</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {ventas.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-muted-foreground py-10">
                    Sin ventas en esta caja.
                  </TableCell>
                </TableRow>
              ) : (
                ventas.map((v) => (
                  <TableRow key={v.id}>
                    <TableCell className="font-mono text-xs">{v.folio}</TableCell>
                    <TableCell className="text-sm">{v.fechaVenta.toLocaleString("es-MX")}</TableCell>
                    <TableCell className="text-sm">{v.clienteNombre ?? "—"}</TableCell>
                    <TableCell className="text-right">{v.totalLineas}</TableCell>
                    <TableCell className="text-right tabular-nums">{fmt(v.total)}</TableCell>
                    <TableCell>
                      {v.estado === "CANCELADA" ? (
                        <Badge variant="destructive">Cancelada</Badge>
                      ) : (
                        <Badge variant="secondary">Completada</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="sm" asChild>
                        <Link href={`/ventas/historial/${v.id}`}>Ver</Link>
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </section>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-card border rounded-lg p-4">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="text-lg font-semibold mt-1 tabular-nums">{value}</div>
    </div>
  );
}
