"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  Package,
  ShoppingCart,
  FileText,
  Truck,
  BarChart3,
  Settings,
  Boxes,
  ClipboardList,
  Wallet,
  HandCoins,
  UserCog,
  ScrollText,
  type LucideIcon,
} from "lucide-react";

export type NavItem = {
  href: string;
  label: string;
  iconName: IconName;
  disabled?: boolean;
};

export type IconName =
  | "home"
  | "ventas"
  | "clientes"
  | "cobranza"
  | "productos"
  | "inventario"
  | "proveedores"
  | "compras"
  | "cxp"
  | "facturacion"
  | "reportes"
  | "usuarios"
  | "config"
  | "auditoria";

const ICONS: Record<IconName, LucideIcon> = {
  home: LayoutDashboard,
  ventas: ShoppingCart,
  clientes: Users,
  cobranza: HandCoins,
  productos: Package,
  inventario: Boxes,
  proveedores: Truck,
  compras: ClipboardList,
  cxp: Wallet,
  facturacion: FileText,
  reportes: BarChart3,
  usuarios: UserCog,
  config: Settings,
  auditoria: ScrollText,
};

export function SidebarNav({ items }: { items: NavItem[] }) {
  const pathname = usePathname() ?? "";

  return (
    <nav className="flex-1 px-3 py-4 space-y-1">
      {items.map((item) => {
        const Icon = ICONS[item.iconName];
        const base =
          "flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all duration-150";

        if (item.disabled) {
          return (
            <span
              key={item.href}
              className={`${base} text-muted-foreground cursor-not-allowed opacity-50`}
              title="Próximamente"
            >
              {Icon && <Icon className="size-4" />}
              {item.label}
            </span>
          );
        }

        const isActive =
          item.href === "/dashboard"
            ? pathname === "/dashboard"
            : pathname === item.href || pathname.startsWith(item.href + "/");

        return (
          <Link
            key={item.href}
            href={item.href}
            className={`${base} relative ${
              isActive
                ? "bg-primary/10 text-primary font-medium"
                : "text-foreground/80 hover:bg-secondary hover:text-foreground"
            }`}
          >
            {isActive && (
              <span
                aria-hidden
                className="absolute left-0 top-2 bottom-2 w-1 rounded-r-full bg-accent"
              />
            )}
            {Icon && (
              <Icon
                className={`size-4 ${isActive ? "text-primary" : ""}`}
              />
            )}
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
