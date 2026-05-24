import Link from "next/link";
import { ArrowLeft, Plus } from "lucide-react";
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

function fmtFecha(d: Date) {
  return new Intl.DateTimeFormat("es-MX", { dateStyle: "short", timeStyle: "short" }).format(d);
}

export default async function TransferenciasPage() {
  await requirePermission("inventario:leer");
  const transferencias = await inventarioService.listarTransferencias();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <Button variant="ghost" size="sm" asChild className="-ml-2">
            <Link href="/inventario">
              <ArrowLeft className="size-4" /> Volver a inventario
            </Link>
          </Button>
          <h2 className="text-2xl font-semibold tracking-tight mt-1">Transferencias entre ubicaciones</h2>
        </div>
        <Button asChild>
          <Link href="/inventario/transferencias/nueva">
            <Plus className="size-4" /> Nueva transferencia
          </Link>
        </Button>
      </div>

      <div className="rounded-lg border bg-card overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Folio</TableHead>
              <TableHead>Fecha</TableHead>
              <TableHead>Origen → Destino</TableHead>
              <TableHead className="text-right">Líneas</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead>Usuario</TableHead>
              <TableHead></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {transferencias.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center text-muted-foreground py-10">
                  Sin transferencias todavía.
                </TableCell>
              </TableRow>
            ) : (
              transferencias.map((t) => (
                <TableRow key={t.id}>
                  <TableCell className="font-mono text-xs">{t.folio}</TableCell>
                  <TableCell className="text-xs whitespace-nowrap">{fmtFecha(t.fecha)}</TableCell>
                  <TableCell className="text-sm">
                    {t.origenNombre} → {t.destinoNombre}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">{t.totalLineas}</TableCell>
                  <TableCell>
                    {t.estado === "COMPLETADA" && <Badge variant="default">Completada</Badge>}
                    {t.estado === "PENDIENTE" && <Badge variant="secondary">Pendiente</Badge>}
                    {t.estado === "CANCELADA" && <Badge variant="destructive">Cancelada</Badge>}
                  </TableCell>
                  <TableCell className="text-xs">{t.usuarioNombre}</TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="sm" asChild>
                      <Link href={`/inventario/transferencias/${t.id}`}>Ver</Link>
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
