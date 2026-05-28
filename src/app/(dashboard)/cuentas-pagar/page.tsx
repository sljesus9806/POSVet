import Link from "next/link";
import { Plus, FilePlus, ReceiptText } from "lucide-react";
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

type SearchParams = Promise<{ estado?: string; vencidas?: string }>;

const ESTADOS = [
  { value: "", label: "Pendientes y parciales" },
  { value: "PENDIENTE", label: "Solo pendientes" },
  { value: "PAGADA_PARCIAL", label: "Solo parciales" },
  { value: "PAGADA", label: "Pagadas" },
  { value: "CANCELADA", label: "Canceladas" },
];

const ESTADO_VARIANT: Record<string, "default" | "outline" | "secondary" | "destructive"> = {
  PENDIENTE: "outline",
  PAGADA_PARCIAL: "secondary",
  PAGADA: "default",
  CANCELADA: "destructive",
};
const ESTADO_LABEL: Record<string, string> = {
  PENDIENTE: "Pendiente",
  PAGADA_PARCIAL: "Parcial",
  PAGADA: "Pagada",
  CANCELADA: "Cancelada",
};

function fmtFecha(d: Date) {
  return new Intl.DateTimeFormat("es-MX", { dateStyle: "medium" }).format(d);
}
function fmtMoneda(n: number) {
  return new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN" }).format(n);
}

export default async function CuentasPagarPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  await requirePermission("cuentas-pagar:leer");
  const sp = await searchParams;
  const estado = sp.estado || undefined;
  const soloVencidas = sp.vencidas === "si";

  const filtro: Parameters<typeof cuentasPagarService.listarFacturas>[0] = {
    soloVencidas,
    limit: 200,
  };
  if (estado) filtro.estado = estado;
  else filtro.estado = undefined;

  const [resumen, facturas] = await Promise.all([
    cuentasPagarService.resumen(),
    cuentasPagarService.listarFacturas(
      estado || soloVencidas
        ? filtro
        : {
            // por defecto: solo PENDIENTE y PAGADA_PARCIAL
            limit: 200,
          },
    ),
  ]);

  // Si no se filtró, recortamos a las que tienen saldo > 0
  const lista = !estado && !soloVencidas
    ? facturas.filter((f) => f.estado === "PENDIENTE" || f.estado === "PAGADA_PARCIAL")
    : facturas;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">Cuentas por pagar</h2>
          <p className="text-sm text-muted-foreground">
            Facturas del proveedor pendientes de pago y registro de pagos.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button asChild variant="outline">
            <Link href="/cuentas-pagar/pagos">
              <ReceiptText className="size-4" /> Ver pagos
            </Link>
          </Button>
          <Button asChild>
            <Link href="/cuentas-pagar/facturas/nueva">
              <FilePlus className="size-4" /> Capturar factura
            </Link>
          </Button>
        </div>
      </div>

      <section className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="rounded-lg border bg-card p-5">
          <div className="text-xs text-muted-foreground">Total por pagar</div>
          <div className="text-2xl font-semibold tabular-nums">
            {fmtMoneda(resumen.totalPorPagar)}
          </div>
        </div>
        <div className="rounded-lg border bg-card p-5">
          <div className="text-xs text-muted-foreground">
            Vencidas ({resumen.vencidasCount})
          </div>
          <div className="text-2xl font-semibold text-destructive tabular-nums">
            {fmtMoneda(resumen.vencidasMonto)}
          </div>
        </div>
        <div className="rounded-lg border bg-card p-5">
          <div className="text-xs text-muted-foreground">
            Vencen en 30 días ({resumen.porVencer30dCount})
          </div>
          <div className="text-2xl font-semibold tabular-nums">
            {fmtMoneda(resumen.porVencer30dMonto)}
          </div>
        </div>
      </section>

      <form className="flex flex-wrap items-end gap-3 bg-card p-4 rounded-lg border">
        <div className="min-w-[220px]">
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
        <label className="flex items-center gap-2 text-sm pb-2">
          <input
            type="checkbox"
            name="vencidas"
            value="si"
            defaultChecked={soloVencidas}
            className="size-4"
          />
          Solo vencidas
        </label>
        <Button type="submit" variant="secondary">
          Filtrar
        </Button>
      </form>

      <div className="rounded-lg border bg-card overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Folio interno</TableHead>
              <TableHead>Folio proveedor</TableHead>
              <TableHead>Proveedor</TableHead>
              <TableHead>Vence</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead className="text-right">Total</TableHead>
              <TableHead className="text-right">Saldo</TableHead>
              <TableHead></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {lista.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center text-muted-foreground py-10">
                  Sin facturas que coincidan con el filtro.
                </TableCell>
              </TableRow>
            ) : (
              lista.map((f) => {
                const vencida = f.diasParaVencer < 0 && f.saldo > 0;
                return (
                  <TableRow key={f.id}>
                    <TableCell className="font-mono text-xs">{f.folio}</TableCell>
                    <TableCell className="font-mono text-xs">{f.folioProveedor}</TableCell>
                    <TableCell>
                      <Link
                        href={`/cuentas-pagar/estado-cuenta/${f.proveedorId}`}
                        className="hover:underline font-medium"
                      >
                        {f.proveedorNombre}
                      </Link>
                    </TableCell>
                    <TableCell className="text-sm">
                      {fmtFecha(f.fechaVencimiento)}
                      {vencida && (
                        <Badge variant="destructive" className="ml-2 text-xs">
                          {Math.abs(f.diasParaVencer)}d vencida
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant={ESTADO_VARIANT[f.estado] ?? "outline"}>
                        {ESTADO_LABEL[f.estado] ?? f.estado}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right tabular-nums text-sm">
                      {fmtMoneda(f.total)}
                    </TableCell>
                    <TableCell className="text-right tabular-nums font-medium">
                      {fmtMoneda(f.saldo)}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="sm" asChild>
                        <Link href={`/cuentas-pagar/facturas/${f.id}`}>Ver</Link>
                      </Button>
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
