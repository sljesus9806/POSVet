import Link from "next/link";
import { notFound } from "next/navigation";
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

type SearchParams = Promise<{ ok?: string }>;

function fmtFecha(d: Date) {
  return new Intl.DateTimeFormat("es-MX", { dateStyle: "medium", timeStyle: "short" }).format(d);
}

function toNum(v: unknown): number {
  if (v === null || v === undefined) return 0;
  if (typeof v === "number") return v;
  return Number(String(v));
}

export default async function TransferenciaDetalle({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: SearchParams;
}) {
  await requirePermission("inventario:leer");
  const { id } = await params;
  const sp = await searchParams;
  const t = await inventarioService.obtenerTransferencia(id);
  if (!t) notFound();

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <Button variant="ghost" size="sm" asChild className="-ml-2">
          <Link href="/inventario/transferencias">
            <ArrowLeft className="size-4" /> Volver
          </Link>
        </Button>
        <h2 className="text-2xl font-semibold tracking-tight mt-1">
          Transferencia <span className="font-mono">{t.folio}</span>
        </h2>
        <div className="text-sm text-muted-foreground mt-1">
          {fmtFecha(t.createdAt)} · por {t.usuario.nombre}
        </div>
      </div>

      {sp.ok && (
        <div className="rounded-md border border-green-600/50 bg-green-600/10 text-green-700 text-sm px-3 py-2">
          Transferencia procesada correctamente. Stock actualizado en ambas ubicaciones.
        </div>
      )}

      <div className="rounded-lg border bg-card p-5 grid grid-cols-2 gap-4">
        <div>
          <p className="text-xs text-muted-foreground">Origen</p>
          <p className="font-medium">{t.origen.nombre}</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Destino</p>
          <p className="font-medium">{t.destino.nombre}</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Estado</p>
          {t.estado === "COMPLETADA" && <Badge>Completada</Badge>}
          {t.estado === "PENDIENTE" && <Badge variant="secondary">Pendiente</Badge>}
          {t.estado === "CANCELADA" && <Badge variant="destructive">Cancelada</Badge>}
        </div>
        {t.observaciones && (
          <div className="col-span-2">
            <p className="text-xs text-muted-foreground">Observaciones</p>
            <p className="text-sm">{t.observaciones}</p>
          </div>
        )}
      </div>

      <div className="rounded-lg border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>SKU</TableHead>
              <TableHead>Producto</TableHead>
              <TableHead className="text-right">Cantidad</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {t.lineas.map((l) => (
              <TableRow key={l.id}>
                <TableCell className="font-mono text-xs">{l.producto.sku}</TableCell>
                <TableCell className="font-medium">{l.producto.nombre}</TableCell>
                <TableCell className="text-right tabular-nums">
                  {toNum(l.cantidad)} {l.producto.unidadMedida}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
