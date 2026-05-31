import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { auditoriaService } from "@/lib/modules/auditoria";
import { requirePermission } from "@/lib/auth-helpers";
import { Button } from "@/components/ui/button";

const fmt = (d: Date) =>
  new Intl.DateTimeFormat("es-MX", { dateStyle: "long", timeStyle: "medium" }).format(d);

function jsonPretty(v: unknown): string {
  if (v === null || v === undefined) return "—";
  try {
    return JSON.stringify(v, null, 2);
  } catch {
    return String(v);
  }
}

export default async function AuditoriaDetallePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requirePermission("auditoria:leer");
  const { id } = await params;
  const reg = await auditoriaService.obtener(id);
  if (!reg) notFound();

  const meta: Array<[string, string]> = [
    ["Fecha", fmt(reg.fecha)],
    [
      "Usuario",
      reg.usuarioNombre
        ? `${reg.usuarioNombre}${reg.usuarioEmail ? ` (${reg.usuarioEmail})` : ""}`
        : "—",
    ],
    ["Módulo", reg.modulo],
    ["Acción", reg.accion],
    ["Entidad", reg.entidad],
    ["ID entidad", reg.entidadId ?? "—"],
    ["IP", reg.ip ?? "—"],
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/auditoria" aria-label="Volver">
            <ChevronLeft className="size-4" />
          </Link>
        </Button>
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">Detalle de auditoría</h2>
          <p className="text-xs text-muted-foreground font-mono">{reg.id}</p>
        </div>
      </div>

      <div className="rounded-lg border bg-card p-5 grid grid-cols-2 md:grid-cols-3 gap-4">
        {meta.map(([k, v]) => (
          <div key={k}>
            <div className="text-xs text-muted-foreground">{k}</div>
            <div className="text-sm font-medium break-words">{v}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div className="rounded-lg border bg-card p-5">
          <h3 className="text-sm font-semibold mb-2">Antes</h3>
          <pre className="text-xs bg-muted/40 rounded-md p-3 overflow-x-auto whitespace-pre-wrap break-words">
            {jsonPretty(reg.antes)}
          </pre>
        </div>
        <div className="rounded-lg border bg-card p-5">
          <h3 className="text-sm font-semibold mb-2">Después</h3>
          <pre className="text-xs bg-muted/40 rounded-md p-3 overflow-x-auto whitespace-pre-wrap break-words">
            {jsonPretty(reg.despues)}
          </pre>
        </div>
      </div>

      {reg.userAgent && (
        <div className="rounded-lg border bg-card p-5">
          <h3 className="text-sm font-semibold mb-1">User agent</h3>
          <p className="text-xs text-muted-foreground break-words">{reg.userAgent}</p>
        </div>
      )}
    </div>
  );
}
