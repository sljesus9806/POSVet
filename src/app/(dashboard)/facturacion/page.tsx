import Link from "next/link";
import { HelpCircle, FlaskConical } from "lucide-react";
import { facturacionService, getFacturacionConfig } from "@/lib/modules/facturacion";
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

const fmt = (n: number) =>
  new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN" }).format(n);

const ESTADOS = ["TODAS", "TIMBRADA", "CANCELADA"] as const;

type SearchParams = Promise<{ q?: string; estado?: string }>;

export default async function FacturacionPage({ searchParams }: { searchParams: SearchParams }) {
  await requirePermission("facturacion:leer");
  const sp = await searchParams;
  const q = sp.q?.trim() || undefined;
  const estado =
    sp.estado === "TIMBRADA" || sp.estado === "CANCELADA" ? sp.estado : undefined;
  const [facturas, cfg] = await Promise.all([
    facturacionService.listar({ q, estado }),
    Promise.resolve(getFacturacionConfig()),
  ]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">Facturación</h2>
          <p className="text-sm text-muted-foreground">
            Facturas electrónicas (CFDI 4.0) emitidas a tus clientes.
          </p>
        </div>
        <Button variant="outline" asChild>
          <Link href="/facturacion/ayuda">
            <HelpCircle className="size-4" /> ¿Cómo facturo?
          </Link>
        </Button>
      </div>

      {cfg.modo === "demo" && (
        <div className="flex items-start gap-2 rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          <FlaskConical className="size-4 shrink-0 mt-0.5" />
          <div>
            <span className="font-semibold">Modo de pruebas activo.</span> Las facturas que
            generes ahora son simuladas y <strong>no tienen validez fiscal</strong> (no se envían
            al SAT). Sirve para practicar. Para emitir facturas reales, el instalador debe
            conectar las credenciales del PAC.
          </div>
        </div>
      )}

      <form className="flex flex-wrap items-end gap-3 bg-card p-4 rounded-lg border">
        <div className="flex-1 min-w-[220px]">
          <label className="text-xs font-medium text-muted-foreground">Buscar</label>
          <Input name="q" defaultValue={q ?? ""} placeholder="RFC, nombre o folio fiscal…" />
        </div>
        <div>
          <label className="text-xs font-medium text-muted-foreground">Estado</label>
          <select
            name="estado"
            defaultValue={sp.estado ?? "TODAS"}
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          >
            {ESTADOS.map((e) => (
              <option key={e} value={e}>
                {e}
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
              <TableHead>Cliente (RFC)</TableHead>
              <TableHead>Venta</TableHead>
              <TableHead className="text-right">Total</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {facturas.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center text-muted-foreground py-10">
                  Aún no hay facturas. Para emitir una, abre una venta en{" "}
                  <Link href="/ventas/historial" className="underline">
                    Ventas → Historial
                  </Link>{" "}
                  y presiona <strong>Facturar</strong>.
                </TableCell>
              </TableRow>
            ) : (
              facturas.map((f) => (
                <TableRow key={f.id}>
                  <TableCell className="font-mono text-xs">
                    {f.serieFolio}
                    {f.esDemo && (
                      <Badge variant="outline" className="ml-2 text-[10px]">
                        demo
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {f.fechaTimbrado?.toLocaleString("es-MX") ?? "—"}
                  </TableCell>
                  <TableCell>
                    <div className="font-medium">{f.receptorNombre}</div>
                    <div className="font-mono text-xs text-muted-foreground">{f.receptorRfc}</div>
                  </TableCell>
                  <TableCell className="font-mono text-xs">
                    {f.ventaFolio ? (
                      <Link href={`/ventas/historial/${f.ventaId}`} className="hover:underline">
                        {f.ventaFolio}
                      </Link>
                    ) : (
                      "—"
                    )}
                  </TableCell>
                  <TableCell className="text-right tabular-nums font-semibold">
                    {fmt(f.total)}
                  </TableCell>
                  <TableCell>
                    {f.estado === "CANCELADA" ? (
                      <Badge variant="destructive">Cancelada</Badge>
                    ) : (
                      <Badge variant="secondary">Timbrada</Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="sm" asChild>
                      <Link href={`/facturacion/${f.id}`}>Ver</Link>
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
