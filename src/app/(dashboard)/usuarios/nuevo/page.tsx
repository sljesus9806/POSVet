import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { usuariosService } from "@/lib/modules/usuarios";
import { requirePermission } from "@/lib/auth-helpers";
import { Button } from "@/components/ui/button";
import { UsuarioForm } from "../usuario-form";

export default async function NuevoUsuarioPage() {
  await requirePermission("usuarios:crear");
  const rolesDisponibles = await usuariosService.listarRolesDisponibles();

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <Button variant="ghost" size="sm" asChild className="-ml-2">
          <Link href="/usuarios">
            <ArrowLeft className="size-4" /> Volver a usuarios
          </Link>
        </Button>
        <h2 className="text-2xl font-semibold tracking-tight mt-1">Nuevo usuario</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Da de alta a alguien que necesita acceso al sistema. Define la contraseña inicial
          y asigna al menos un rol.
        </p>
      </div>
      <UsuarioForm rolesDisponibles={rolesDisponibles} />
    </div>
  );
}
