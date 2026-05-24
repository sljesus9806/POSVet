import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { requirePermission } from "@/lib/auth-helpers";
import { Button } from "@/components/ui/button";
import { ClienteForm } from "../cliente-form";

export default async function NuevoClientePage() {
  await requirePermission("clientes:crear");

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <Button variant="ghost" size="sm" asChild className="-ml-2">
          <Link href="/clientes">
            <ArrowLeft className="size-4" /> Volver a clientes
          </Link>
        </Button>
        <h2 className="text-2xl font-semibold tracking-tight mt-1">Nuevo cliente</h2>
        <p className="text-sm text-muted-foreground mt-1">
          El código (CLI-NNNNN) se asigna automáticamente al guardar.
        </p>
      </div>
      <ClienteForm />
    </div>
  );
}
