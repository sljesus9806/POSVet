import Link from "next/link";
import {
  BarChart3,
  Boxes,
  HandCoins,
  Package,
  ShoppingCart,
  TrendingUp,
  Users,
  Wallet,
  type LucideIcon,
} from "lucide-react";

import { requireUser, hasPermission } from "@/lib/auth-helpers";
import { reportesService } from "@/lib/modules/reportes";
import { ventasService } from "@/lib/modules/ventas";
import { inventarioService } from "@/lib/modules/inventario";
import { KpiCard } from "@/components/dashboard/kpi-card";
import { ChartCard, BarOrLineChart } from "@/components/reportes/chart-card";
import { Button } from "@/components/ui/button";

const fmt = (n: number) =>
  new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN" }).format(n);

const fmtHora = (d: Date) =>
  new Intl.DateTimeFormat("es-MX", { hour: "2-digit", minute: "2-digit" }).format(d);

export default async function DashboardHome() {
  const user = await requireUser();
  const puede = (codigo: string) => hasPermission(user, codigo);

  const ahora = new Date();
  const desde = new Date(ahora.getFullYear(), ahora.getMonth(), ahora.getDate());

  const verVentas = puede("ventas:leer") || puede("reportes:leer");
  const verCaja = puede("cajas:leer") || puede("ventas:crear");
  const verCxC = puede("cobranza:leer") || puede("reportes:leer");
  const verInv = puede("inventario:leer");

  // Solo se consulta lo que el usuario tiene permiso de ver.
  const [ventasHoy, caja, cxc, bajoStock, porCaducar] = await Promise.all([
    verVentas ? reportesService.ventasDelDia({ desde, hasta: ahora }) : null,
    verCaja ? ventasService.cajaAbiertaDeUsuario(user.id) : null,
    verCxC ? reportesService.antiguedadSaldosCxC() : null,
    verInv ? inventarioService.alertasBajoStock() : null,
    verInv ? inventarioService.alertasPorCaducar(30) : null,
  ]);

  // Relleno de las 24 horas para la gráfica (mismo patrón que reportes/ventas-dia).
  const datosHora = ventasHoy
    ? Array.from({ length: 24 }, (_, h) => ({
        hora: `${String(h).padStart(2, "0")}h`,
        total: ventasHoy.porHora.find((x) => x.hora === h)?.total ?? 0,
      }))
    : [];

  const numBajo = bajoStock?.length ?? 0;
  const numCaducar = porCaducar?.length ?? 0;

  const accesos = [
    puede("ventas:crear") && { href: "/ventas", label: "Nueva venta", icon: ShoppingCart },
    puede("productos:leer") && { href: "/productos", label: "Productos", icon: Package },
    puede("clientes:leer") && { href: "/clientes", label: "Clientes", icon: Users },
    puede("reportes:leer") && { href: "/reportes", label: "Reportes", icon: BarChart3 },
  ].filter(Boolean) as Array<{ href: string; label: string; icon: LucideIcon }>;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight">
          Hola, {user.nombre}
        </h2>
        <p className="text-muted-foreground text-sm mt-1">
          Resumen de tu operación de hoy.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {ventasHoy && (
          <KpiCard
            titulo="Ventas de hoy"
            valor={fmt(ventasHoy.totalVendido)}
            icono={TrendingUp}
            href={puede("reportes:leer") ? "/reportes/ventas-dia" : undefined}
            detalle={`${ventasHoy.numTickets} ${
              ventasHoy.numTickets === 1 ? "ticket" : "tickets"
            } · prom. ${fmt(ventasHoy.ticketPromedio)}`}
          />
        )}

        {verCaja &&
          (caja ? (
            <KpiCard
              titulo="Tu caja"
              valor={fmt(caja.totalVendido)}
              icono={Wallet}
              href="/ventas"
              detalle={`Caja ${caja.folio} · abierta ${fmtHora(caja.abiertaEn)}`}
            />
          ) : (
            <KpiCard
              titulo="Tu caja"
              valor="Sin abrir"
              icono={Wallet}
              href="/ventas"
              tono="warning"
              detalle="Abre una caja para empezar a vender"
            />
          ))}

        {cxc && (
          <KpiCard
            titulo="Por cobrar"
            valor={fmt(cxc.totalGeneral)}
            icono={HandCoins}
            href={puede("cobranza:leer") ? "/cobranza" : undefined}
            tono={cxc.totalBucketMas90 > 0 ? "danger" : "default"}
            detalle={
              cxc.totalBucketMas90 > 0 ? (
                <span className="text-destructive font-medium">
                  Vencido +90 días: {fmt(cxc.totalBucketMas90)}
                </span>
              ) : (
                "Sin saldos vencidos a +90 días"
              )
            }
          />
        )}

        {verInv && (
          <KpiCard
            titulo="Alertas de inventario"
            valor={String(numBajo + numCaducar)}
            icono={Boxes}
            href="/productos"
            tono={numBajo > 0 ? "danger" : numCaducar > 0 ? "warning" : "default"}
            detalle={
              numBajo + numCaducar === 0
                ? "Todo en orden"
                : `${numBajo} bajo mínimo · ${numCaducar} por caducar (30d)`
            }
          />
        )}
      </div>

      {ventasHoy && (
        <ChartCard
          title="Ventas por hora · hoy"
          subtitle="Importe vendido por franja horaria"
        >
          {ventasHoy.numTickets > 0 ? (
            <BarOrLineChart
              data={datosHora}
              xKey="hora"
              yKeys={[{ key: "total", label: "Ventas" }]}
              type="bar"
              currency
              height={240}
            />
          ) : (
            <p className="py-12 text-center text-sm text-muted-foreground">
              Aún no hay ventas registradas hoy.
            </p>
          )}
        </ChartCard>
      )}

      {accesos.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold mb-3">Accesos rápidos</h3>
          <div className="flex flex-wrap gap-2">
            {accesos.map((a) => {
              const Icono = a.icon;
              return (
                <Button key={a.href} asChild variant="outline">
                  <Link href={a.href}>
                    <Icono />
                    {a.label}
                  </Link>
                </Button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
