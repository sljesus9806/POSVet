import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { clientesService } from "@/lib/modules/clientes";
import { requirePermission } from "@/lib/auth-helpers";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ClienteForm } from "../cliente-form";

type SearchParams = Promise<{ ok?: string }>;

function fmtFecha(d: Date) {
  return new Intl.DateTimeFormat("es-MX", { dateStyle: "medium", timeStyle: "short" }).format(d);
}

export default async function ClienteDetallePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: SearchParams;
}) {
  await requirePermission("clientes:leer");
  const { id } = await params;
  const sp = await searchParams;

  const cliente = await clientesService.obtener(id);
  if (!cliente) notFound();

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <Button variant="ghost" size="sm" asChild className="-ml-2">
          <Link href="/clientes">
            <ArrowLeft className="size-4" /> Volver a clientes
          </Link>
        </Button>
        <div className="flex items-center gap-3 mt-1 flex-wrap">
          <h2 className="text-2xl font-semibold tracking-tight">{cliente.nombre}</h2>
          <span className="font-mono text-sm text-muted-foreground">{cliente.codigo}</span>
          <Badge variant="secondary">{cliente.tipoCliente}</Badge>
          {!cliente.activo && <Badge variant="destructive">Inactivo</Badge>}
        </div>
        <p className="text-xs text-muted-foreground mt-1">
          Alta {fmtFecha(cliente.createdAt)} · última edición {fmtFecha(cliente.updatedAt)} · precio aplicable: <strong>{cliente.tipoPrecioEfectivo}</strong>
        </p>
      </div>

      {sp.ok === "creado" && (
        <div className="rounded-md border border-green-600/50 bg-green-600/10 text-green-700 text-sm px-3 py-2">
          Cliente creado correctamente con código <strong>{cliente.codigo}</strong>.
        </div>
      )}

      <ClienteForm cliente={cliente} />
    </div>
  );
}
