import Link from "next/link";
import { BarChart3, Package, Users } from "lucide-react";
import { requirePermission } from "@/lib/auth-helpers";

const REPORTES = [
  {
    href: "/reportes/ventas-dia",
    titulo: "Ventas del día",
    descripcion: "Total, número de tickets, ticket promedio y desglose por hora.",
    icon: BarChart3,
  },
  {
    href: "/reportes/productos-vendidos",
    titulo: "Productos vendidos",
    descripcion: "Ranking de productos por monto y cantidad en un rango de fechas.",
    icon: Package,
  },
  {
    href: "/reportes/ventas-por-usuario",
    titulo: "Ventas por usuario",
    descripcion: "Cuánto vendió cada cajero en un rango de fechas.",
    icon: Users,
  },
];

export default async function ReportesPage() {
  await requirePermission("reportes:leer");

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight">Reportes</h2>
        <p className="text-sm text-muted-foreground">
          Selecciona un reporte para ver detalles, filtrar y exportar a PDF.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {REPORTES.map((r) => {
          const Icon = r.icon;
          return (
            <Link
              key={r.href}
              href={r.href}
              className="group rounded-lg border bg-card p-5 hover:border-primary/50 hover:shadow-sm transition-all"
            >
              <div className="flex items-start gap-3">
                <div className="rounded-md bg-primary/10 p-2 text-primary">
                  <Icon className="size-5" />
                </div>
                <div className="flex-1 space-y-1">
                  <h3 className="font-semibold group-hover:text-primary transition-colors">
                    {r.titulo}
                  </h3>
                  <p className="text-sm text-muted-foreground">{r.descripcion}</p>
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
