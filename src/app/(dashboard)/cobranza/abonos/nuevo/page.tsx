import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { clientesService } from "@/lib/modules/clientes";
import { cobranzaService } from "@/lib/modules/cobranza";
import { requirePermission } from "@/lib/auth-helpers";
import { Button } from "@/components/ui/button";
import { NuevoAbonoForm } from "./nuevo-abono-form";

type SearchParams = Promise<{ clienteId?: string; ventaId?: string }>;

export default async function NuevoAbonoPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  await requirePermission("cobranza:crear");
  const sp = await searchParams;

  const clientes = await clientesService.listar({ soloActivos: true });

  // Pre-cargar ventas pendientes del cliente
  let ventasIniciales: Awaited<ReturnType<typeof cobranzaService.listarVentasCredito>> = [];
  if (sp.clienteId) {
    ventasIniciales = await cobranzaService.listarVentasCredito({
      clienteId: sp.clienteId,
      soloPendientes: true,
      limit: 200,
    });
  }

  return (
    <div className="space-y-6 max-w-5xl">
      <div>
        <Button variant="ghost" size="sm" asChild className="-ml-2">
          <Link href="/cobranza/abonos">
            <ArrowLeft className="size-4" /> Volver a abonos
          </Link>
        </Button>
        <h2 className="text-2xl font-semibold tracking-tight mt-1">Registrar abono</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Captura el monto total recibido y distribúyelo entre las ventas a crédito pendientes del
          cliente. La suma debe igualar el monto.
        </p>
      </div>
      <NuevoAbonoForm
        clientes={clientes.map((c) => ({
          id: c.id,
          codigo: c.codigo,
          nombre: c.nombre,
          saldoActual: c.saldoActual,
        }))}
        clienteIdInicial={sp.clienteId ?? null}
        ventaIdInicial={sp.ventaId ?? null}
        ventasIniciales={ventasIniciales.map((v) => ({
          ventaId: v.ventaId,
          folio: v.folio,
          fechaVenta: v.fechaVenta.toISOString(),
          saldoCredito: v.saldoCredito,
          montoCredito: v.montoCredito,
        }))}
      />
    </div>
  );
}
