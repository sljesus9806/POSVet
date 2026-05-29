"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import { Pencil, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { TableCell, TableRow } from "@/components/ui/table";
import { actualizarUbicacionAction, type FormState } from "./actions";
import type { UbicacionListado } from "@/lib/modules/configuracion";

const initial: FormState = { ok: false };

const TIPO_LABEL: Record<UbicacionListado["tipo"], string> = {
  TIENDA: "Tienda",
  BODEGA: "Bodega",
  SUCURSAL: "Sucursal",
};

function Submit() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" size="sm" disabled={pending}>
      {pending ? "Guardando…" : "Guardar"}
    </Button>
  );
}

function Err({ msgs }: { msgs?: string[] }) {
  if (!msgs?.length) return null;
  return <p className="text-xs text-destructive mt-1">{msgs.join(" · ")}</p>;
}

export function UbicacionFila({ u }: { u: UbicacionListado }) {
  const [editing, setEditing] = useState(false);
  const [state, formAction] = useActionState(actualizarUbicacionAction, initial);

  if (!editing) {
    return (
      <TableRow>
        <TableCell className="font-medium">{u.nombre}</TableCell>
        <TableCell>
          <Badge variant="outline">{TIPO_LABEL[u.tipo]}</Badge>
        </TableCell>
        <TableCell className="text-muted-foreground text-sm">
          {u.direccion ?? "—"}
        </TableCell>
        <TableCell className="text-sm">{u.numInventarios}</TableCell>
        <TableCell>
          {u.activa ? (
            <Badge>Activa</Badge>
          ) : (
            <Badge variant="secondary">Inactiva</Badge>
          )}
        </TableCell>
        <TableCell className="text-right">
          <Button variant="ghost" size="sm" onClick={() => setEditing(true)}>
            <Pencil className="size-4" /> Editar
          </Button>
        </TableCell>
      </TableRow>
    );
  }

  return (
    <TableRow className="bg-muted/30">
      <TableCell colSpan={6} className="p-4">
        <form action={formAction} className="space-y-3">
          <input type="hidden" name="id" value={u.id} />

          {state.error && (
            <div className="rounded-md border border-destructive/50 bg-destructive/10 text-destructive text-xs px-3 py-2">
              {state.error}
            </div>
          )}
          {state.ok && (
            <div className="rounded-md border border-green-600/50 bg-green-600/10 text-green-700 text-xs px-3 py-2">
              ✓ Ubicación actualizada.
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <Label htmlFor={`nombre-${u.id}`}>Nombre</Label>
              <Input
                id={`nombre-${u.id}`}
                name="nombre"
                defaultValue={u.nombre}
                required
              />
              <Err msgs={state.fieldErrors?.nombre} />
            </div>
            <div>
              <Label htmlFor={`tipo-${u.id}`}>Tipo</Label>
              <select
                id={`tipo-${u.id}`}
                name="tipo"
                defaultValue={u.tipo}
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs"
              >
                <option value="TIENDA">Tienda</option>
                <option value="BODEGA">Bodega</option>
                <option value="SUCURSAL">Sucursal</option>
              </select>
            </div>
            <div>
              <Label htmlFor={`direccion-${u.id}`}>Dirección</Label>
              <Input
                id={`direccion-${u.id}`}
                name="direccion"
                defaultValue={u.direccion ?? ""}
              />
            </div>
          </div>

          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              name="activa"
              defaultChecked={u.activa}
              className="size-4"
            />
            Ubicación activa
            <span className="text-xs text-muted-foreground">
              (desactivar requiere stock 0 en todos sus inventarios)
            </span>
          </label>

          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setEditing(false)}
            >
              <X className="size-4" /> Cancelar
            </Button>
            <Submit />
          </div>
        </form>
      </TableCell>
    </TableRow>
  );
}
