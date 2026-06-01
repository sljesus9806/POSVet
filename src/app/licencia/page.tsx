import { redirect } from "next/navigation";
import { ShieldAlert } from "lucide-react";
import { licenciaService } from "@/lib/modules/licencia";

// Consulta la BD (estado de licencia) en cada request: no debe prerenderizarse
// en build (no hay BD durante `next build`).
export const dynamic = "force-dynamic";

// Pantalla de bloqueo a página completa (fuera del layout del dashboard, sin
// sidebar). Solo se muestra cuando la licencia está expirada/ausente/inválida;
// si la licencia está vigente o en gracia, redirige de vuelta al sistema.
export default async function LicenciaPage() {
  const lic = await licenciaService.evaluar();
  if (!lic.bloqueado) redirect("/dashboard");

  const detalle =
    lic.estado === "ausente"
      ? "Este equipo no tiene una licencia instalada."
      : lic.estado === "invalida"
        ? "La licencia de este equipo es inválida o fue manipulada."
        : lic.mensaje;

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/30 p-6">
      <div className="w-full max-w-md rounded-xl border bg-card p-8 text-center shadow-sm">
        <span className="mx-auto mb-5 flex size-14 items-center justify-center rounded-full bg-destructive/10 text-destructive">
          <ShieldAlert className="size-7" />
        </span>
        <h1 className="text-xl font-semibold tracking-tight">
          Sistema bloqueado
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">{detalle}</p>

        {lic.cliente && (
          <p className="mt-4 text-xs uppercase tracking-wider text-muted-foreground">
            Licenciado a:{" "}
            <span className="font-semibold text-foreground">{lic.cliente}</span>
          </p>
        )}

        <div className="mt-6 rounded-lg bg-secondary/40 p-4 text-left text-sm">
          <p className="font-medium">Para reactivar el sistema:</p>
          <p className="mt-1 text-muted-foreground">
            Contacta a tu proveedor para renovar la licencia. Tus datos están
            seguros y no se han perdido; el acceso se restablece en cuanto se
            instale una licencia vigente.
          </p>
        </div>
      </div>
    </div>
  );
}
