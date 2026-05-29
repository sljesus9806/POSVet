import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { hasPermission, type SessionUser } from "@/lib/auth-helpers";
import { Button } from "@/components/ui/button";
import { logoutAction } from "./actions";
import { SidebarNav, type NavItem } from "./sidebar-nav";
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
  Stethoscope,
} from "lucide-react";

const NAV: Array<NavItem & { permiso?: string }> = [
  { href: "/dashboard", label: "Inicio", iconName: "home" },
  { href: "/ventas", label: "Ventas", iconName: "ventas", permiso: "ventas:leer" },
  { href: "/clientes", label: "Clientes", iconName: "clientes", permiso: "clientes:leer" },
  { href: "/cobranza", label: "Cobranza", iconName: "cobranza", permiso: "cobranza:leer" },
  { href: "/productos", label: "Productos", iconName: "productos", permiso: "productos:leer" },
  { href: "/inventario", label: "Inventario", iconName: "inventario", permiso: "inventario:leer" },
  { href: "/proveedores", label: "Proveedores", iconName: "proveedores", permiso: "proveedores:leer" },
  { href: "/compras", label: "Compras", iconName: "compras", permiso: "compras:leer" },
  { href: "/cuentas-pagar", label: "Cuentas por pagar", iconName: "cxp", permiso: "cuentas-pagar:leer" },
  { href: "/facturacion", label: "Facturación", iconName: "facturacion", disabled: true, permiso: "facturacion:leer" },
  { href: "/reportes", label: "Reportes", iconName: "reportes", permiso: "reportes:leer" },
  { href: "/usuarios", label: "Usuarios", iconName: "usuarios", permiso: "usuarios:leer" },
  { href: "/configuracion", label: "Configuración", iconName: "config", permiso: "configuracion:leer" },
];

const ICONS = {
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
};

function saludo(now: Date): string {
  const h = now.getHours();
  if (h < 12) return "Buenos días";
  if (h < 19) return "Buenas tardes";
  return "Buenas noches";
}

function fechaLarga(now: Date): string {
  return new Intl.DateTimeFormat("es-MX", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(now);
}

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const user = session.user as SessionUser;
  const visibleNav = NAV.filter(
    (item) => !item.permiso || hasPermission(user, item.permiso),
  );

  const ahora = new Date();
  const nombreCorto = user.nombre.split(" ")[0] ?? user.nombre;

  return (
    <div className="flex min-h-screen w-full">
      <aside className="w-64 shrink-0 border-r bg-card flex flex-col">
        <div className="h-16 px-5 flex items-center gap-2.5 border-b">
          <span className="flex size-9 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-sm">
            <Stethoscope className="size-5" />
          </span>
          <div className="leading-none">
            <p className="font-semibold text-base tracking-tight">POSVet</p>
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider mt-0.5">
              Punto de venta
            </p>
          </div>
        </div>

        <SidebarNav items={visibleNav} icons={ICONS} />

        <div className="border-t p-3 space-y-2">
          <div className="rounded-lg bg-secondary/40 px-3 py-2.5 text-sm">
            <p className="font-medium truncate leading-tight">
              {user.nombre}
            </p>
            <p className="text-xs text-muted-foreground truncate mt-0.5">
              {user.email}
            </p>
            <p className="text-[10px] uppercase tracking-wider text-primary/80 mt-1.5 font-semibold">
              {user.roles?.join(" · ")}
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
        <header className="h-16 border-b px-6 flex items-center justify-between bg-card/80 backdrop-blur-sm">
          <div>
            <p className="text-sm font-medium leading-tight">
              {saludo(ahora)}, <span className="text-primary">{nombreCorto}</span>
            </p>
            <p className="text-[11px] text-muted-foreground capitalize leading-tight mt-0.5">
              {fechaLarga(ahora)}
            </p>
          </div>
        </header>
        <div className="flex-1 p-6 bg-muted/30">{children}</div>
      </main>
    </div>
  );
}
