"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  actualizarUsuarioAction,
  crearUsuarioAction,
  type FormState,
} from "./actions";
import type {
  RolCodigo,
  RolDisponible,
  UsuarioDetalle,
} from "@/lib/modules/usuarios";

const initial: FormState = { ok: false };

function Submit({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? "Guardando…" : label}
    </Button>
  );
}

function Err({ msgs }: { msgs?: string[] }) {
  if (!msgs?.length) return null;
  return <p className="text-xs text-destructive mt-1">{msgs.join(" · ")}</p>;
}

export function UsuarioForm({
  usuario,
  rolesDisponibles,
  esYoMismo,
}: {
  usuario?: UsuarioDetalle;
  rolesDisponibles: RolDisponible[];
  esYoMismo?: boolean;
}) {
  const isEdit = !!usuario;
  const action = isEdit ? actualizarUsuarioAction : crearUsuarioAction;
  const [state, formAction] = useActionState(action, initial);

  const rolesActuales: RolCodigo[] = usuario?.roles ?? ["CAJERO"];

  return (
    <form action={formAction} className="space-y-6">
      {isEdit && <input type="hidden" name="id" value={usuario!.id} />}

      {state.error && (
        <div className="rounded-md border border-destructive/50 bg-destructive/10 text-destructive text-sm px-3 py-2">
          {state.error}
        </div>
      )}
      {state.ok && (
        <div className="rounded-md border border-green-600/50 bg-green-600/10 text-green-700 text-sm px-3 py-2">
          Usuario guardado correctamente.
        </div>
      )}

      <section className="rounded-lg border bg-card p-5 space-y-4">
        <h3 className="font-semibold">Datos personales</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="nombre">Nombre completo</Label>
            <Input
              id="nombre"
              name="nombre"
              defaultValue={usuario?.nombre}
              required
              placeholder="Juan Pérez"
            />
            <Err msgs={state.fieldErrors?.nombre} />
          </div>
          <div>
            <Label htmlFor="email">Correo electrónico</Label>
            <Input
              id="email"
              name="email"
              type="email"
              defaultValue={usuario?.email}
              required
              placeholder="juan@empresa.com"
              className="lowercase font-mono"
            />
            <Err msgs={state.fieldErrors?.email} />
          </div>
        </div>
      </section>

      {!isEdit && (
        <section className="rounded-lg border bg-card p-5 space-y-4">
          <h3 className="font-semibold">Contraseña inicial</h3>
          <p className="text-xs text-muted-foreground">
            El usuario puede cambiarla después desde su perfil (próximamente). Mínimo 10
            caracteres.
          </p>
          <div>
            <Label htmlFor="password">Contraseña</Label>
            <Input
              id="password"
              name="password"
              type="password"
              required
              minLength={10}
              placeholder="••••••••••"
            />
            <Err msgs={state.fieldErrors?.password} />
          </div>
        </section>
      )}

      <section className="rounded-lg border bg-card p-5 space-y-4">
        <h3 className="font-semibold">Roles</h3>
        <p className="text-xs text-muted-foreground">
          Los permisos se derivan de los roles asignados. Un usuario puede tener varios.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {rolesDisponibles.map((r) => (
            <label
              key={r.codigo}
              className="flex items-start gap-3 rounded-md border p-3 cursor-pointer hover:bg-accent/40"
            >
              <input
                type="checkbox"
                name="roles"
                value={r.codigo}
                defaultChecked={rolesActuales.includes(r.codigo)}
                className="size-4 mt-0.5"
              />
              <div className="space-y-0.5">
                <div className="text-sm font-medium">{r.nombre}</div>
                {r.descripcion && (
                  <div className="text-xs text-muted-foreground">{r.descripcion}</div>
                )}
              </div>
            </label>
          ))}
        </div>
        <Err msgs={state.fieldErrors?.roles} />
      </section>

      {isEdit && (
        <section className="rounded-lg border bg-card p-5 space-y-3">
          <h3 className="font-semibold">Estado</h3>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              name="activo"
              defaultChecked={usuario?.activo ?? true}
              disabled={esYoMismo}
              className="size-4"
            />
            Usuario activo
            <span className="text-xs text-muted-foreground">
              (desactivar conserva el historial, solo bloquea el acceso)
            </span>
          </label>
          {esYoMismo && (
            <p className="text-xs text-muted-foreground">
              No puedes desactivarte ni quitarte el rol ADMIN a ti mismo.
            </p>
          )}
        </section>
      )}

      <div className="flex gap-3 justify-end">
        <Button variant="outline" asChild>
          <Link href={isEdit ? `/usuarios/${usuario!.id}` : "/usuarios"}>Cancelar</Link>
        </Button>
        <Submit label={isEdit ? "Guardar cambios" : "Crear usuario"} />
      </div>
    </form>
  );
}
