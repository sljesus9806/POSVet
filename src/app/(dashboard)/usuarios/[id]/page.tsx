import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, KeyRound, ShieldAlert, User } from "lucide-react";
import { usuariosService } from "@/lib/modules/usuarios";
import { requirePermission } from "@/lib/auth-helpers";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { UsuarioForm } from "../usuario-form";
import { PasswordForm } from "./password-form";
import { DesbloquearForm } from "./desbloquear-form";

type SearchParams = Promise<{ tab?: string; ok?: string }>;
type Tab = "datos" | "seguridad";

const TABS: Array<{ id: Tab; label: string; icon: typeof User }> = [
  { id: "datos", label: "Datos y roles", icon: User },
  { id: "seguridad", label: "Seguridad", icon: KeyRound },
];

function fmtFecha(d: Date | null): string {
  if (!d) return "—";
  return new Intl.DateTimeFormat("es-MX", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(d);
}

export default async function UsuarioDetallePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: SearchParams;
}) {
  const user = await requirePermission("usuarios:leer");
  const { id } = await params;
  const sp = await searchParams;

  const usuario = await usuariosService.obtenerDetalle(id);
  if (!usuario) notFound();

  const rolesDisponibles = await usuariosService.listarRolesDisponibles();

  const tabRequested = (sp.tab ?? "datos") as Tab;
  const tab: Tab = TABS.some((t) => t.id === tabRequested) ? tabRequested : "datos";
  const esYoMismo = usuario.id === user.id;

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <Button variant="ghost" size="sm" asChild className="-ml-2">
          <Link href="/usuarios">
            <ArrowLeft className="size-4" /> Volver a usuarios
          </Link>
        </Button>
        <div className="flex items-start justify-between gap-4 flex-wrap mt-1">
          <div>
            <h2 className="text-2xl font-semibold tracking-tight">{usuario.nombre}</h2>
            <p className="text-sm text-muted-foreground font-mono">{usuario.email}</p>
          </div>
          <div className="flex flex-col items-end gap-1">
            {!usuario.activo ? (
              <Badge variant="secondary">Inactivo</Badge>
            ) : usuario.bloqueado ? (
              <Badge variant="destructive">Bloqueado</Badge>
            ) : (
              <Badge>Activo</Badge>
            )}
            <p className="text-xs text-muted-foreground">
              Último login: {fmtFecha(usuario.ultimoLoginAt)}
            </p>
          </div>
        </div>
        {sp.ok === "creado" && (
          <div className="mt-3 rounded-md border border-green-600/50 bg-green-600/10 text-green-700 text-sm px-3 py-2">
            ✓ Usuario creado. Comparte la contraseña inicial por un canal seguro.
          </div>
        )}
      </div>

      <nav className="flex gap-1 border-b">
        {TABS.map((t) => {
          const Icon = t.icon;
          const active = t.id === tab;
          return (
            <Link
              key={t.id}
              href={`/usuarios/${usuario.id}?tab=${t.id}`}
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

      {tab === "datos" && (
        <UsuarioForm
          usuario={usuario}
          rolesDisponibles={rolesDisponibles}
          esYoMismo={esYoMismo}
        />
      )}

      {tab === "seguridad" && (
        <div className="space-y-6">
          <section className="rounded-lg border bg-card p-5 space-y-4">
            <div className="flex items-center gap-2">
              <ShieldAlert className="size-4" />
              <h3 className="font-semibold">Estado de seguridad</h3>
            </div>
            <dl className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
              <div>
                <dt className="text-xs text-muted-foreground">Intentos fallidos</dt>
                <dd className="font-medium">{usuario.intentosFallidos}</dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">Bloqueado hasta</dt>
                <dd className="font-medium">
                  {usuario.bloqueado ? fmtFecha(usuario.bloqueadoHasta) : "—"}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">Cuenta creada</dt>
                <dd className="font-medium">{fmtFecha(usuario.createdAt)}</dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">Última modificación</dt>
                <dd className="font-medium">{fmtFecha(usuario.updatedAt)}</dd>
              </div>
            </dl>
            {usuario.bloqueado && (
              <div className="pt-3 border-t">
                <p className="text-xs text-muted-foreground mb-2">
                  Forzar el desbloqueo sin esperar al fin del periodo:
                </p>
                <DesbloquearForm usuarioId={usuario.id} />
              </div>
            )}
          </section>

          <section className="rounded-lg border bg-card p-5 space-y-4">
            <h3 className="font-semibold">Restablecer contraseña</h3>
            <p className="text-xs text-muted-foreground">
              Asigna una nueva contraseña al usuario. Se reinician los intentos fallidos y
              se desbloquea la cuenta. Comparte la nueva contraseña por un canal seguro.
            </p>
            <PasswordForm usuarioId={usuario.id} />
          </section>
        </div>
      )}
    </div>
  );
}
