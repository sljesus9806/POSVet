import Link from "next/link";
import { redirect } from "next/navigation";
import { Building2, MapPin } from "lucide-react";
import { configuracionService } from "@/lib/modules/configuracion";
import { requirePermission } from "@/lib/auth-helpers";
import {
  Table,
  TableBody,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { EmpresaForm } from "./empresa-form";
import { UbicacionFila } from "./ubicacion-fila";
import { UbicacionNuevaForm } from "./ubicacion-nueva-form";

type SearchParams = Promise<{ tab?: string; soloActivas?: string }>;

type Tab = "empresa" | "ubicaciones";
const TABS: Array<{ id: Tab; label: string; icon: typeof Building2 }> = [
  { id: "empresa", label: "Empresa", icon: Building2 },
  { id: "ubicaciones", label: "Ubicaciones", icon: MapPin },
];

export default async function ConfiguracionPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const user = await requirePermission("configuracion:leer");
  const sp = await searchParams;
  const tabRequested = (sp.tab ?? "empresa") as Tab;
  const tab: Tab = TABS.some((t) => t.id === tabRequested) ? tabRequested : "empresa";

  const empresa = await configuracionService.obtenerEmpresa(user.empresaId);
  if (!empresa) redirect("/dashboard?error=empresa_no_configurada");

  const soloActivas = sp.soloActivas !== "no";
  const ubicaciones =
    tab === "ubicaciones"
      ? await configuracionService.listarUbicaciones(user.empresaId, { soloActivas })
      : [];

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight">Configuración</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Datos de empresa, ubicaciones (tienda, bodega, sucursales) y parámetros generales.
        </p>
      </div>

      <nav className="flex gap-1 border-b">
        {TABS.map((t) => {
          const Icon = t.icon;
          const active = t.id === tab;
          return (
            <Link
              key={t.id}
              href={`/configuracion?tab=${t.id}`}
              className={`flex items-center gap-2 px-4 py-2 text-sm border-b-2 -mb-px transition-colors ${
                active
                  ? "border-primary text-foreground font-medium"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              <Icon className="size-4" /> {t.label}
            </Link>
          );
        })}
      </nav>

      {tab === "empresa" && <EmpresaForm empresa={empresa} />}

      {tab === "ubicaciones" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <p className="text-sm text-muted-foreground">
              Estas ubicaciones aparecen en inventario, cajas, ventas y compras.
            </p>
            <div className="flex items-center gap-3">
              <Link
                href={`/configuracion?tab=ubicaciones&soloActivas=${soloActivas ? "no" : "si"}`}
                className="text-xs text-muted-foreground hover:text-foreground underline"
              >
                {soloActivas ? "Mostrar inactivas" : "Solo activas"}
              </Link>
              <UbicacionNuevaForm />
            </div>
          </div>

          <div className="rounded-lg border bg-card overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nombre</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Dirección</TableHead>
                  <TableHead>Inventarios</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {ubicaciones.length === 0 ? (
                  <TableRow>
                    <td
                      colSpan={6}
                      className="p-8 text-center text-sm text-muted-foreground"
                    >
                      No hay ubicaciones {soloActivas ? "activas" : ""}.
                    </td>
                  </TableRow>
                ) : (
                  ubicaciones.map((u) => <UbicacionFila key={u.id} u={u} />)
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      )}
    </div>
  );
}
