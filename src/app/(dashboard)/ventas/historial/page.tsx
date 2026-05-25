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

type SearchParams = Promise<{ estado?: string }>;

export default async function HistorialPage({ searchParams }: { searchParams: SearchParams }) {
  await requirePermission("ventas:leer");
  const sp = await searchParams;
  const estado = sp.estado === "CANCELADA" ? "CANCELADA" : sp.estado === "COMPLETADA" ? "COMPLETADA" : undefined;

  const [ventas, hoy] = await Promise.all([
    ventasService.listarVentas({ estado, limit: 200 }),
    ventasService.ventasDelDia(),
  ]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">Historial de ventas</h2>
          <p className="text-sm text-muted-foreground">Ventas registradas, con estado y totales.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" asChild>
            <Link href="/ventas/cajas">Cajas</Link>
          </Button>
          <Button asChild>
            <Link href="/ventas">Vender</Link>
          </Button>
        </div>
      </div>

      <section className="grid grid-cols-1 md:grid-cols-4 gap-3">
        <Stat label="Ventas hoy" value={String(hoy.totalTickets)} />
        <Stat label="Total hoy" value={fmt(hoy.totalVendido)} />
        <Stat label="Ticket promedio" value={fmt(hoy.ticketPromedio)} />
        <Stat
          label="Efectivo hoy"
          value={fmt(hoy.porFormaPago.find((f) => f.forma === "EFECTIVO")?.total ?? 0)}
        />
      </section>

      <form className="flex flex-wrap items-end gap-3 bg-card p-4 rounded-lg border">
        <div>
          <label className="text-xs font-medium text-muted-foreground">Estado</label>
          <select
            name="estado"
            defaultValue={estado ?? ""}
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          >
            <option value="">Todos</option>
            <option value="COMPLETADA">Completadas</option>
            <option value="CANCELADA">Canceladas</option>
          </select>
        </div>
        <Button type="submit" variant="secondary">Filtrar</Button>
      </form>

      <div className="rounded-lg border bg-card overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Folio</TableHead>
              <TableHead>Fecha</TableHead>
              <TableHead>Cajero</TableHead>
              <TableHead>Cliente</TableHead>
              <TableHead>Caja</TableHead>
              <TableHead className="text-right">Líneas</TableHead>
              <TableHead className="text-right">Total</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {ventas.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} className="text-center text-muted-foreground py-10">
                  Sin ventas.
                </TableCell>
              </TableRow>
            ) : (
              ventas.map((v) => (
                <TableRow key={v.id} className={v.estado === "CANCELADA" ? "opacity-60" : ""}>
                  <TableCell className="font-mono text-xs">{v.folio}</TableCell>
                  <TableCell className="text-sm">{v.fechaVenta.toLocaleString("es-MX")}</TableCell>
                  <TableCell className="text-sm">{v.usuarioNombre}</TableCell>
                  <TableCell className="text-sm">{v.clienteNombre ?? "—"}</TableCell>
                  <TableCell className="font-mono text-xs">{v.cajaFolio}</TableCell>
                  <TableCell className="text-right">{v.totalLineas}</TableCell>
                  <TableCell className="text-right tabular-nums font-semibold">
                    {fmt(v.total)}
                  </TableCell>
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
