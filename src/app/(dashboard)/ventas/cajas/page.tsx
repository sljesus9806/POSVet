import Link from "next/link";
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

const fmt = (n: number) =>
  new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN" }).format(n);

export default async function CajasPage() {
  await requirePermission("cajas:leer");
  const cajas = await ventasService.listarCajas({ limit: 50 });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">Cajas</h2>
          <p className="text-sm text-muted-foreground">Aperturas y cierres de caja.</p>
        </div>
        <Button asChild>
          <Link href="/ventas">Punto de venta</Link>
        </Button>
      </div>

      <div className="rounded-lg border bg-card overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Folio</TableHead>
              <TableHead>Ubicación</TableHead>
              <TableHead>Cajero</TableHead>
              <TableHead>Apertura</TableHead>
              <TableHead>Cierre</TableHead>
              <TableHead className="text-right">Vendido</TableHead>
              <TableHead className="text-right">Diferencia</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {cajas.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} className="text-center text-muted-foreground py-10">
                  Sin cajas aún.
                </TableCell>
              </TableRow>
            ) : (
              cajas.map((c) => (
                <TableRow key={c.id}>
                  <TableCell className="font-mono text-xs">{c.folio}</TableCell>
                  <TableCell>{c.ubicacionNombre}</TableCell>
                  <TableCell>{c.abiertaPorNombre}</TableCell>
                  <TableCell className="text-sm">
                    {c.abiertaEn.toLocaleString("es-MX")}
                  </TableCell>
                  <TableCell className="text-sm">
                    {c.cerradaEn ? c.cerradaEn.toLocaleString("es-MX") : "—"}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">{fmt(c.totalVendido)}</TableCell>
                  <TableCell className="text-right tabular-nums">
                    {c.diferenciaEfectivo === null ? (
                      "—"
                    ) : c.diferenciaEfectivo === 0 ? (
                      <span className="text-muted-foreground">{fmt(0)}</span>
                    ) : c.diferenciaEfectivo > 0 ? (
                      <span className="text-green-600">+{fmt(c.diferenciaEfectivo)}</span>
                    ) : (
                      <span className="text-destructive">{fmt(c.diferenciaEfectivo)}</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {c.estado === "ABIERTA" ? (
                      <Badge>Abierta</Badge>
                    ) : (
                      <Badge variant="secondary">Cerrada</Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="sm" asChild>
                      <Link href={`/ventas/cajas/${c.id}`}>Ver</Link>
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
