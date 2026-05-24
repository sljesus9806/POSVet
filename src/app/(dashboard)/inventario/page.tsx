import Link from "next/link";
import { AlertTriangle, ArrowRightLeft, ClipboardList, History } from "lucide-react";
import { prisma } from "@/lib/modules/shared/db";
import { inventarioService } from "@/lib/modules/inventario";
import { requirePermission } from "@/lib/auth-helpers";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

type SearchParams = Promise<{ q?: string; ubicacionId?: string }>;

export default async function InventarioPage({ searchParams }: { searchParams: SearchParams }) {
  await requirePermission("inventario:leer");
  const sp = await searchParams;

  const ubicaciones = await prisma.ubicacion.findMany({
    where: { activa: true },
    orderBy: { nombre: "asc" },
  });

  const [stock, bajoStock, porCaducar] = await Promise.all([
    inventarioService.listarStock({
      q: sp.q,
      ubicacionId: sp.ubicacionId || undefined,
    }),
    inventarioService.alertasBajoStock(),
    inventarioService.alertasPorCaducar(90),
  ]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">Inventario</h2>
          <p className="text-sm text-muted-foreground">
            Stock por ubicación, alertas y movimientos.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" asChild>
            <Link href="/inventario/movimientos">
              <History className="size-4" /> Kardex
            </Link>
          </Button>
          <Button variant="outline" asChild>
            <Link href="/inventario/transferencias">
              <ArrowRightLeft className="size-4" /> Transferencias
            </Link>
          </Button>
          <Button asChild>
            <Link href="/inventario/ajustes">
              <ClipboardList className="size-4" /> Ajustar stock
            </Link>
          </Button>
        </div>
      </div>

      {(bajoStock.length > 0 || porCaducar.length > 0) && (
        <section className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="rounded-lg border bg-card p-4">
            <div className="flex items-center gap-2 mb-3">
              <AlertTriangle className="size-4 text-destructive" />
              <h3 className="font-semibold">Bajo stock ({bajoStock.length})</h3>
            </div>
            {bajoStock.length === 0 ? (
              <p className="text-sm text-muted-foreground">Sin alertas.</p>
            ) : (
              <ul className="text-sm divide-y max-h-56 overflow-auto">
                {bajoStock.map((a) => (
                  <li key={`${a.productoId}-${a.ubicacionId}`} className="py-2 flex justify-between gap-3">
                    <span>
                      <Link href={`/productos/${a.productoId}`} className="font-medium hover:underline">
                        {a.nombre}
                      </Link>
                      <span className="text-muted-foreground"> · {a.ubicacionNombre}</span>
                    </span>
                    <span className="tabular-nums whitespace-nowrap">
                      {a.stock} <span className="text-muted-foreground">/ mín {a.stockMinimo}</span>
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="rounded-lg border bg-card p-4">
            <div className="flex items-center gap-2 mb-3">
              <AlertTriangle className="size-4 text-orange-500" />
              <h3 className="font-semibold">Próximos a caducar (90 días)</h3>
            </div>
            {porCaducar.length === 0 ? (
              <p className="text-sm text-muted-foreground">Sin alertas.</p>
            ) : (
              <ul className="text-sm divide-y max-h-56 overflow-auto">
                {porCaducar.map((a) => (
                  <li key={a.loteId} className="py-2 flex justify-between gap-3">
                    <span>
                      <Link href={`/productos/${a.productoId}`} className="font-medium hover:underline">
                        {a.productoNombre}
                      </Link>
                      <span className="text-muted-foreground"> · Lote {a.lote}</span>
                    </span>
                    <span className="whitespace-nowrap">
                      {a.diasRestantes < 0 ? (
                        <Badge variant="destructive">Caducado</Badge>
                      ) : a.diasRestantes <= 30 ? (
                        <Badge variant="destructive">{a.diasRestantes} días</Badge>
                      ) : (
                        <Badge variant="outline">{a.diasRestantes} días</Badge>
                      )}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>
      )}

      <form className="flex flex-wrap items-end gap-3 bg-card p-4 rounded-lg border">
        <div className="flex-1 min-w-[220px]">
          <label className="text-xs font-medium text-muted-foreground">Buscar producto</label>
          <Input name="q" defaultValue={sp.q ?? ""} placeholder="SKU o nombre…" />
        </div>
        <div>
          <label className="text-xs font-medium text-muted-foreground">Ubicación</label>
          <select
            name="ubicacionId"
            defaultValue={sp.ubicacionId ?? ""}
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          >
            <option value="">Todas</option>
            {ubicaciones.map((u) => (
              <option key={u.id} value={u.id}>
                {u.nombre} ({u.tipo})
              </option>
            ))}
          </select>
        </div>
        <Button type="submit" variant="secondary">Filtrar</Button>
      </form>

      <div className="rounded-lg border bg-card overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>SKU</TableHead>
              <TableHead>Producto</TableHead>
              <TableHead>Ubicación</TableHead>
              <TableHead className="text-right">Stock</TableHead>
              <TableHead className="text-right">Mínimo</TableHead>
              <TableHead>Alerta</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {stock.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-muted-foreground py-10">
                  Sin registros de stock.
                </TableCell>
              </TableRow>
            ) : (
              stock.map((s) => {
                const bajo = s.stockMinimo > 0 && s.stock <= s.stockMinimo;
                return (
                  <TableRow key={`${s.productoId}-${s.ubicacionId}`}>
                    <TableCell className="font-mono text-xs">{s.sku}</TableCell>
                    <TableCell className="font-medium">
                      <Link href={`/productos/${s.productoId}`} className="hover:underline">
                        {s.productoNombre}
                      </Link>
                    </TableCell>
                    <TableCell className="text-sm">{s.ubicacionNombre}</TableCell>
                    <TableCell className="text-right tabular-nums">
                      {s.stock} {s.unidadMedida}
                    </TableCell>
                    <TableCell className="text-right tabular-nums text-muted-foreground">
                      {s.stockMinimo}
                    </TableCell>
                    <TableCell>
                      {bajo ? <Badge variant="destructive">Bajo stock</Badge> : null}
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
