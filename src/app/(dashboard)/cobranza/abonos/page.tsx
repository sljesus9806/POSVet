import Link from "next/link";
import { ArrowLeft, Plus } from "lucide-react";
import { cobranzaService } from "@/lib/modules/cobranza";
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
  return new Intl.DateTimeFormat("es-MX", { dateStyle: "medium" }).format(d);
}
function fmtMoneda(n: number) {
  return new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN" }).format(n);
}

export default async function AbonosPage() {
  await requirePermission("cobranza:leer");
  const abonos = await cobranzaService.listarAbonos({ limit: 200 });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <Button variant="ghost" size="sm" asChild className="-ml-2">
            <Link href="/cobranza">
              <ArrowLeft className="size-4" /> Volver a cobranza
            </Link>
          </Button>
          <h2 className="text-2xl font-semibold tracking-tight mt-1">Abonos de clientes</h2>
        </div>
        <Button asChild>
          <Link href="/cobranza/abonos/nuevo">
            <Plus className="size-4" /> Registrar abono
          </Link>
        </Button>
      </div>

      <div className="rounded-lg border bg-card overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Folio</TableHead>
              <TableHead>Fecha</TableHead>
              <TableHead>Cliente</TableHead>
              <TableHead>Forma</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead className="text-right">Ventas</TableHead>
              <TableHead className="text-right">Monto</TableHead>
              <TableHead></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {abonos.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center text-muted-foreground py-10">
                  Sin abonos registrados.
                </TableCell>
              </TableRow>
            ) : (
              abonos.map((a) => (
                <TableRow key={a.id} className={a.estado === "CANCELADO" ? "opacity-60" : ""}>
                  <TableCell className="font-mono text-xs">{a.folio}</TableCell>
                  <TableCell className="text-sm">{fmtFecha(a.fecha)}</TableCell>
                  <TableCell className="font-medium">{a.clienteNombre}</TableCell>
                  <TableCell className="text-sm">{a.formaPago}</TableCell>
                  <TableCell>
                    <Badge variant={a.estado === "CANCELADO" ? "destructive" : "default"}>
                      {a.estado === "CANCELADO" ? "Cancelado" : "Registrado"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right tabular-nums text-sm">{a.totalAplicaciones}</TableCell>
                  <TableCell className="text-right tabular-nums font-medium">
                    {fmtMoneda(a.monto)}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="sm" asChild>
                      <Link href={`/cobranza/abonos/${a.id}`}>Ver</Link>
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
