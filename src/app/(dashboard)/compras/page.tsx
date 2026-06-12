import Link from "next/link";
import { Plus } from "lucide-react";
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

type SearchParams = Promise<{ estado?: string }>;

const ESTADOS = [
  { value: "", label: "Todos" },
  { value: "BORRADOR", label: "Borrador" },
  { value: "ENVIADA", label: "Enviada" },
  { value: "RECIBIDA_PARCIAL", label: "Recibida parcial" },
  { value: "RECIBIDA_TOTAL", label: "Recibida total" },
  { value: "CANCELADA", label: "Cancelada" },
];

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

function fmtFecha(d: Date) {
  return new Intl.DateTimeFormat("es-MX", { dateStyle: "medium" }).format(d);
}

function fmtMoneda(n: number) {
  return new Intl.NumberFormat("es-MX", {
    style: "currency",
    currency: "MXN",
  }).format(n);
}

export default async function ComprasPage({ searchParams }: { searchParams: SearchParams }) {
  await requirePermission("compras:leer");
  const sp = await searchParams;
  const estado = sp.estado || undefined;
  const ordenes = await comprasService.listarOrdenes({ estado, limit: 100 });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">Compras</h2>
          <p className="text-sm text-muted-foreground">
            Órdenes de compra a proveedores y recepción de mercancía a bodega.
          </p>
        </div>
        <Button asChild>
          <Link href="/compras/nueva">
            <Plus className="size-4" /> Nueva OC
          </Link>
        </Button>
      </div>

      <form className="flex flex-wrap items-end gap-3 bg-card p-4 rounded-lg border">
        <div className="min-w-[200px]">
          <label className="text-xs font-medium text-muted-foreground">Estado</label>
          <select
            name="estado"
            defaultValue={estado ?? ""}
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          >
            {ESTADOS.map((e) => (
              <option key={e.value} value={e.value}>
                {e.label}
              </option>
            ))}
          </select>
        </div>
        <Button type="submit" variant="secondary">
          Filtrar
        </Button>
      </form>

      <div className="rounded-lg border bg-card overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Folio</TableHead>
              <TableHead>Fecha</TableHead>
              <TableHead>Proveedor</TableHead>
              <TableHead>Destino</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead className="text-right">Líneas</TableHead>
              <TableHead className="text-right">Total</TableHead>
              <TableHead></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {ordenes.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center text-muted-foreground py-10">
                  Sin órdenes de compra. Crea una con &ldquo;Nueva OC&rdquo;.
                </TableCell>
              </TableRow>
            ) : (
              ordenes.map((o) => (
                <TableRow key={o.id}>
                  <TableCell className="font-mono text-xs">{o.folio}</TableCell>
                  <TableCell className="text-sm">{fmtFecha(o.fecha)}</TableCell>
                  <TableCell className="font-medium">{o.proveedorNombre ?? "Sin proveedor"}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {o.ubicacionDestinoNombre}
                  </TableCell>
                  <TableCell>
                    <Badge variant={ESTADO_VARIANT[o.estado] ?? "outline"}>
                      {ESTADO_LABEL[o.estado] ?? o.estado}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right tabular-nums text-sm">
                    {o.lineasCompletas}/{o.totalLineas}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {fmtMoneda(o.total)}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="sm" asChild>
                      <Link href={`/compras/${o.id}`}>Ver</Link>
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
