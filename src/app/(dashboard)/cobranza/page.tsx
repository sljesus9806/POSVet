import Link from "next/link";
import { Plus, HandCoins } from "lucide-react";
import { cobranzaService } from "@/lib/modules/cobranza";
import { requirePermission } from "@/lib/auth-helpers";
import { Button } from "@/components/ui/button";
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

export default async function CobranzaPage() {
  await requirePermission("cobranza:leer");
  const [resumen, ventas] = await Promise.all([
    cobranzaService.resumen(),
    cobranzaService.listarVentasCredito({ soloPendientes: true, limit: 200 }),
  ]);

  // Agrupar por cliente para mostrar saldo por cliente
  const porCliente = new Map<string, { clienteId: string; nombre: string; saldo: number; ventas: number }>();
  for (const v of ventas) {
    const prev = porCliente.get(v.clienteId) ?? {
      clienteId: v.clienteId,
      nombre: v.clienteNombre,
      saldo: 0,
      ventas: 0,
    };
    prev.saldo += v.saldoCredito;
    prev.ventas += 1;
    porCliente.set(v.clienteId, prev);
  }
  const clientesConSaldo = Array.from(porCliente.values()).sort((a, b) => b.saldo - a.saldo);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">Cobranza</h2>
          <p className="text-sm text-muted-foreground">
            Saldos de clientes con ventas a crédito y registro de abonos.
          </p>
        </div>
        <div className="flex gap-2">
          <Button asChild variant="outline">
            <Link href="/cobranza/abonos">Ver abonos</Link>
          </Button>
          <Button asChild>
            <Link href="/cobranza/abonos/nuevo">
              <Plus className="size-4" /> Registrar abono
            </Link>
          </Button>
        </div>
      </div>

      <section className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="rounded-lg border bg-card p-5">
          <div className="text-xs text-muted-foreground">Total por cobrar</div>
          <div className="text-2xl font-semibold tabular-nums">
            {fmtMoneda(resumen.totalPorCobrar)}
          </div>
        </div>
        <div className="rounded-lg border bg-card p-5">
          <div className="text-xs text-muted-foreground">Clientes con saldo</div>
          <div className="text-2xl font-semibold tabular-nums">
            {resumen.clientesConSaldo}
          </div>
        </div>
      </section>

      <section className="rounded-lg border bg-card">
        <div className="p-4 border-b">
          <h3 className="font-semibold">Clientes con saldo</h3>
        </div>
        {clientesConSaldo.length === 0 ? (
          <p className="text-sm text-muted-foreground p-6 text-center">
            No hay ventas a crédito pendientes de cobro.
          </p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Cliente</TableHead>
                <TableHead className="text-right">Ventas pendientes</TableHead>
                <TableHead className="text-right">Saldo</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {clientesConSaldo.map((c) => (
                <TableRow key={c.clienteId}>
                  <TableCell className="font-medium">{c.nombre}</TableCell>
                  <TableCell className="text-right tabular-nums">{c.ventas}</TableCell>
                  <TableCell className="text-right tabular-nums font-medium">
                    {fmtMoneda(c.saldo)}
                  </TableCell>
                  <TableCell className="text-right space-x-2">
                    <Button variant="ghost" size="sm" asChild>
                      <Link href={`/cobranza/estado-cuenta/${c.clienteId}`}>Estado de cuenta</Link>
                    </Button>
                    <Button variant="outline" size="sm" asChild>
                      <Link href={`/cobranza/abonos/nuevo?clienteId=${c.clienteId}`}>
                        <HandCoins className="size-4" /> Abonar
                      </Link>
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </section>

      <section className="rounded-lg border bg-card">
        <div className="p-4 border-b">
          <h3 className="font-semibold">Ventas a crédito pendientes</h3>
        </div>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Folio</TableHead>
                <TableHead>Fecha</TableHead>
                <TableHead>Cliente</TableHead>
                <TableHead className="text-right">Días</TableHead>
                <TableHead className="text-right">Crédito orig.</TableHead>
                <TableHead className="text-right">Saldo</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {ventas.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-muted-foreground py-10">
                    Sin ventas a crédito pendientes.
                  </TableCell>
                </TableRow>
              ) : (
                ventas.map((v) => (
                  <TableRow key={v.ventaId}>
                    <TableCell className="font-mono text-xs">{v.folio}</TableCell>
                    <TableCell className="text-sm">{fmtFecha(v.fechaVenta)}</TableCell>
                    <TableCell>
                      <Link
                        href={`/cobranza/estado-cuenta/${v.clienteId}`}
                        className="font-medium hover:underline"
                      >
                        {v.clienteNombre}
                      </Link>
                    </TableCell>
                    <TableCell className="text-right tabular-nums text-sm">
                      {v.diasDesdeVenta}
                    </TableCell>
                    <TableCell className="text-right tabular-nums text-sm">
                      {fmtMoneda(v.montoCredito)}
                    </TableCell>
                    <TableCell className="text-right tabular-nums font-medium">
                      {fmtMoneda(v.saldoCredito)}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="sm" asChild>
                        <Link href={`/ventas/historial/${v.ventaId}`}>Ver venta</Link>
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
