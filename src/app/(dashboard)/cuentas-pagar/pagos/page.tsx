import Link from "next/link";
import { ArrowLeft, Plus } from "lucide-react";
import { cuentasPagarService } from "@/lib/modules/cuentas-pagar";
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

export default async function PagosListadoPage() {
  await requirePermission("cuentas-pagar:leer");
  const pagos = await cuentasPagarService.listarPagos({ limit: 200 });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <Button variant="ghost" size="sm" asChild className="-ml-2">
            <Link href="/cuentas-pagar">
              <ArrowLeft className="size-4" /> Volver a cuentas por pagar
            </Link>
          </Button>
          <h2 className="text-2xl font-semibold tracking-tight mt-1">Pagos a proveedores</h2>
        </div>
        <Button asChild>
          <Link href="/cuentas-pagar/pagos/nuevo">
            <Plus className="size-4" /> Registrar pago
          </Link>
        </Button>
      </div>

      <div className="rounded-lg border bg-card overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Folio</TableHead>
              <TableHead>Fecha</TableHead>
              <TableHead>Proveedor</TableHead>
              <TableHead>Forma</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead className="text-right">Facturas</TableHead>
              <TableHead className="text-right">Monto</TableHead>
              <TableHead></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {pagos.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center text-muted-foreground py-10">
                  Sin pagos registrados.
                </TableCell>
              </TableRow>
            ) : (
              pagos.map((p) => (
                <TableRow key={p.id} className={p.estado === "CANCELADO" ? "opacity-60" : ""}>
                  <TableCell className="font-mono text-xs">{p.folio}</TableCell>
                  <TableCell className="text-sm">{fmtFecha(p.fecha)}</TableCell>
                  <TableCell className="font-medium">{p.proveedorNombre}</TableCell>
                  <TableCell className="text-sm">{p.formaPago}</TableCell>
                  <TableCell>
                    <Badge variant={p.estado === "CANCELADO" ? "destructive" : "default"}>
                      {p.estado === "CANCELADO" ? "Cancelado" : "Registrado"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right tabular-nums text-sm">
                    {p.totalAplicaciones}
                  </TableCell>
                  <TableCell className="text-right tabular-nums font-medium">
                    {fmtMoneda(p.monto)}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="sm" asChild>
                      <Link href={`/cuentas-pagar/pagos/${p.id}`}>Ver</Link>
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
