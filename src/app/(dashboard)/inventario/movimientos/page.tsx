import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { inventarioService } from "@/lib/modules/inventario";
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

type SearchParams = Promise<{ productoId?: string; ubicacionId?: string }>;

function fmtFechaHora(d: Date) {
  return new Intl.DateTimeFormat("es-MX", { dateStyle: "short", timeStyle: "short" }).format(d);
}

export default async function MovimientosPage({ searchParams }: { searchParams: SearchParams }) {
  await requirePermission("inventario:leer");
  const sp = await searchParams;

  const movimientos = await inventarioService.listarMovimientos({
    productoId: sp.productoId,
    ubicacionId: sp.ubicacionId,
    limit: 200,
  });

  return (
    <div className="space-y-6">
      <div>
        <Button variant="ghost" size="sm" asChild className="-ml-2">
          <Link href="/inventario">
            <ArrowLeft className="size-4" /> Volver a inventario
          </Link>
        </Button>
        <h2 className="text-2xl font-semibold tracking-tight mt-1">Kardex de movimientos</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Últimos 200 movimientos {sp.productoId ? "filtrados por producto" : ""}.
        </p>
      </div>

      <div className="rounded-lg border bg-card overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Fecha</TableHead>
              <TableHead>Producto</TableHead>
              <TableHead>Ubicación</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead>Motivo</TableHead>
              <TableHead>Lote</TableHead>
              <TableHead className="text-right">Cantidad</TableHead>
              <TableHead className="text-right">Stock resultante</TableHead>
              <TableHead>Usuario</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {movimientos.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} className="text-center text-muted-foreground py-10">
                  Sin movimientos registrados todavía.
                </TableCell>
              </TableRow>
            ) : (
              movimientos.map((m) => (
                <TableRow key={m.id}>
                  <TableCell className="text-xs whitespace-nowrap">{fmtFechaHora(m.fecha)}</TableCell>
                  <TableCell>
                    <Link href={`/productos/${m.productoId}`} className="hover:underline">
                      <span className="font-mono text-xs text-muted-foreground">{m.productoSku}</span>
                      <br />
                      <span className="font-medium">{m.productoNombre}</span>
                    </Link>
                  </TableCell>
                  <TableCell className="text-sm">{m.ubicacionNombre}</TableCell>
                  <TableCell>
                    {m.tipo === "ENTRADA" && <Badge variant="default">Entrada</Badge>}
                    {m.tipo === "SALIDA" && <Badge variant="destructive">Salida</Badge>}
                    {m.tipo === "TRANSFERENCIA" && <Badge variant="secondary">Transfer.</Badge>}
                  </TableCell>
                  <TableCell className="text-xs">{m.motivo}</TableCell>
                  <TableCell className="font-mono text-xs">{m.loteNumero ?? "—"}</TableCell>
                  <TableCell className="text-right tabular-nums">
                    {m.tipo === "ENTRADA" ? "+" : m.tipo === "SALIDA" ? "−" : "↔"}
                    {m.cantidad}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">{m.stockResultante}</TableCell>
                  <TableCell className="text-xs">{m.usuarioNombre}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
