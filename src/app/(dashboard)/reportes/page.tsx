import Link from "next/link";
import {
  BarChart3,
  CalendarClock,
  Clock,
  HandCoins,
  Package,
  PackageX,
  Users,
  Wallet,
  Warehouse,
} from "lucide-react";
import { requirePermission } from "@/lib/auth-helpers";

type ReporteCard = {
  href: string;
  titulo: string;
  descripcion: string;
  icon: typeof BarChart3;
  grupo: string;
  tone: "primary" | "accent" | "success" | "warning" | "info" | "danger";
};

const REPORTES: ReporteCard[] = [
  {
    href: "/reportes/ventas-dia",
    titulo: "Ventas del día",
    descripcion:
      "Total, número de tickets, ticket promedio y desglose por hora con gráfica.",
    icon: BarChart3,
    grupo: "Ventas",
    tone: "primary",
  },
  {
    href: "/reportes/productos-vendidos",
    titulo: "Productos vendidos",
    descripcion: "Top 10 en gráfica + ranking completo por monto y cantidad.",
    icon: Package,
    grupo: "Ventas",
    tone: "primary",
  },
  {
    href: "/reportes/ventas-por-usuario",
    titulo: "Ventas por usuario",
    descripcion: "Cuánto vendió cada cajero, con donut de participación.",
    icon: Users,
    grupo: "Ventas",
    tone: "primary",
  },
  {
    href: "/reportes/corte-caja",
    titulo: "Corte de caja",
    descripcion: "Cajas por rango con esperado vs contado y diferencia; corte formal por caja.",
    icon: Wallet,
    grupo: "Ventas",
    tone: "primary",
  },
  {
    href: "/reportes/inventario-actual",
    titulo: "Inventario actual",
    descripcion: "Stock valorizado a costo y precio venta. Capital invertido por categoría.",
    icon: Warehouse,
    grupo: "Inventario",
    tone: "info",
  },
  {
    href: "/reportes/productos-por-caducar",
    titulo: "Productos por caducar",
    descripcion: "Lotes con caducidad próxima (30/60/90 d) o vencidos.",
    icon: CalendarClock,
    grupo: "Inventario",
    tone: "warning",
  },
  {
    href: "/reportes/productos-sin-movimiento",
    titulo: "Productos sin movimiento",
    descripcion: "Inventario muerto: sin venta en los últimos N días.",
    icon: PackageX,
    grupo: "Inventario",
    tone: "danger",
  },
  {
    href: "/reportes/antiguedad-saldos",
    titulo: "Antigüedad de saldos",
    descripcion: "Cuentas por cobrar y por pagar en buckets 0–30 / 31–60 / 61–90 / +90 d.",
    icon: HandCoins,
    grupo: "Cobranza y pagos",
    tone: "accent",
  },
];

const TONES: Record<ReporteCard["tone"], string> = {
  primary: "bg-primary/10 text-primary",
  accent: "bg-accent/10 text-accent",
  success: "bg-[var(--success)]/15 text-[var(--success)]",
  warning: "bg-[var(--warning)]/20 text-[color:var(--warning-foreground)]",
  info: "bg-[var(--info)]/10 text-[var(--info)]",
  danger: "bg-destructive/10 text-destructive",
};

const GRUPOS = ["Ventas", "Inventario", "Cobranza y pagos"];

export default async function ReportesPage() {
  await requirePermission("reportes:leer");

  return (
    <div className="space-y-8">
      <div className="flex items-center gap-3">
        <span className="flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <Clock className="size-5" />
        </span>
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">Reportes</h2>
          <p className="text-sm text-muted-foreground">
            Selecciona un reporte para ver detalles, filtrar, ver gráficas y exportar a PDF.
          </p>
        </div>
      </div>

      {GRUPOS.map((grupo) => {
        const items = REPORTES.filter((r) => r.grupo === grupo);
        if (items.length === 0) return null;
        return (
          <section key={grupo} className="space-y-3">
            <h3 className="text-xs uppercase tracking-wider font-semibold text-muted-foreground">
              {grupo}
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {items.map((r) => {
                const Icon = r.icon;
                return (
                  <Link
                    key={r.href}
                    href={r.href}
                    className="group rounded-xl border bg-card p-5 hover:border-primary/40 hover:shadow-md transition-all"
                  >
                    <div className="flex items-start gap-3">
                      <div className={`rounded-lg p-2.5 ${TONES[r.tone]}`}>
                        <Icon className="size-5" />
                      </div>
                      <div className="flex-1 space-y-1.5">
                        <h4 className="font-semibold text-[15px] group-hover:text-primary transition-colors leading-tight">
                          {r.titulo}
                        </h4>
                        <p className="text-xs text-muted-foreground leading-relaxed">
                          {r.descripcion}
                        </p>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          </section>
        );
      })}
    </div>
  );
}
