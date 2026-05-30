import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export type KpiTono = "default" | "success" | "warning" | "danger";

const TONOS: Record<KpiTono, { icono: string; valor: string }> = {
  default: { icono: "bg-primary/10 text-primary", valor: "text-foreground" },
  success: { icono: "bg-primary/10 text-primary", valor: "text-primary" },
  warning: { icono: "bg-accent/10 text-accent", valor: "text-foreground" },
  danger: { icono: "bg-destructive/10 text-destructive", valor: "text-destructive" },
};

/**
 * Tarjeta de indicador para el panel de inicio. Sin estado (server-friendly).
 * Si recibe `href`, toda la tarjeta es un enlace con realce al pasar el cursor.
 */
export function KpiCard({
  titulo,
  valor,
  detalle,
  icono: Icono,
  href,
  tono = "default",
}: {
  titulo: string;
  valor: string;
  detalle?: ReactNode;
  icono: LucideIcon;
  href?: string;
  tono?: KpiTono;
}) {
  const t = TONOS[tono];

  const inner = (
    <Card
      className={cn(
        "p-5 h-full",
        href && "transition-shadow hover:shadow-md hover:border-primary/30",
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-medium text-muted-foreground">{titulo}</p>
          <p
            className={cn(
              "mt-1 text-2xl font-semibold tracking-tight tabular-nums",
              t.valor,
            )}
          >
            {valor}
          </p>
          {detalle && (
            <div className="mt-1 text-xs text-muted-foreground">{detalle}</div>
          )}
        </div>
        <span className={cn("shrink-0 rounded-lg p-2", t.icono)}>
          <Icono className="size-5" />
        </span>
      </div>
    </Card>
  );

  return href ? (
    <Link href={href} className="block">
      {inner}
    </Link>
  ) : (
    inner
  );
}
