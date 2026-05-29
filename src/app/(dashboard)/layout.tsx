import { redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/auth";
import { hasPermission, type SessionUser } from "@/lib/auth-helpers";
import { Button } from "@/components/ui/button";
import { logoutAction } from "./actions";
import {
  LayoutDashboard,
  Users,
  Package,
  ShoppingCart,
  FileText,
  Truck,
  BarChart3,
  Settings,
  LogOut,
  Boxes,
  ClipboardList,
  Wallet,
  HandCoins,
  UserCog,
} from "lucide-react";

const NAV = [
  { href: "/dashboard", label: "Inicio", icon: LayoutDashboard },
  { href: "/ventas", label: "Ventas", icon: ShoppingCart },
  { href: "/clientes", label: "Clientes", icon: Users },
  { href: "/cobranza", label: "Cobranza", icon: HandCoins },
  { href: "/productos", label: "Productos", icon: Package },
  { href: "/inventario", label: "Inventario", icon: Boxes },
  { href: "/proveedores", label: "Proveedores", icon: Truck },
  { href: "/compras", label: "Compras", icon: ClipboardList },
  { href: "/cuentas-pagar", label: "Cuentas por pagar", icon: Wallet },
  { href: "/facturacion", label: "Facturación", icon: FileText, disabled: true },
  { href: "/reportes", label: "Reportes", icon: BarChart3 },
  { href: "/usuarios", label: "Usuarios", icon: UserCog, permiso: "usuarios:leer" },
  { href: "/configuracion", label: "Configuración", icon: Settings },
];

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const user = session.user as SessionUser;
  const visibleNav = NAV.filter(
    (item) => !("permiso" in item) || !item.permiso || hasPermission(user, item.permiso),
  );

  return (
    <div className="flex min-h-screen w-full">
      <aside className="w-64 shrink-0 border-r bg-card flex flex-col">
        <div className="h-16 px-6 flex items-center border-b">
          <span className="font-semibold text-lg">POSVet</span>
        </div>
        <nav className="flex-1 px-3 py-4 space-y-1">
          {visibleNav.map((item) => {
            const Icon = item.icon;
            const className =
              "flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors";
            if (item.disabled) {
              return (
                <span
                  key={item.href}
                  className={`${className} text-muted-foreground cursor-not-allowed opacity-60`}
                  title="Próximamente"
                >
                  <Icon className="size-4" />
                  {item.label}
                </span>
              );
            }
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`${className} hover:bg-accent hover:text-accent-foreground`}
              >
                <Icon className="size-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="border-t p-3 space-y-2">
          <div className="px-3 py-2 text-sm">
            <p className="font-medium truncate">{session.user.nombre}</p>
            <p className="text-xs text-muted-foreground truncate">
              {session.user.email}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              {session.user.roles?.join(", ")}
            </p>
          </div>
          <form action={logoutAction}>
            <Button
              type="submit"
              variant="outline"
              size="sm"
              className="w-full justify-start"
            >
              <LogOut className="size-4" />
              Cerrar sesión
            </Button>
          </form>
        </div>
      </aside>

      <main className="flex-1 flex flex-col">
        <header className="h-16 border-b px-6 flex items-center bg-card">
          <h1 className="font-medium">Dashboard</h1>
        </header>
        <div className="flex-1 p-6 bg-muted/20">{children}</div>
      </main>
    </div>
  );
}
