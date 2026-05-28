"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  actualizarProveedorAction,
  crearProveedorAction,
  type FormState,
} from "./actions";
import type { ProveedorDetalle } from "@/lib/modules/proveedores";

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

export function ProveedorForm({ proveedor }: { proveedor?: ProveedorDetalle }) {
  const isEdit = !!proveedor;
  const action = isEdit ? actualizarProveedorAction : crearProveedorAction;
  const [state, formAction] = useActionState(action, initial);

  return (
    <form action={formAction} className="space-y-6">
      {isEdit && <input type="hidden" name="id" value={proveedor!.id} />}

      {state.error && (
        <div className="rounded-md border border-destructive/50 bg-destructive/10 text-destructive text-sm px-3 py-2">
          {state.error}
        </div>
      )}
      {state.ok && (
        <div className="rounded-md border border-green-600/50 bg-green-600/10 text-green-700 text-sm px-3 py-2">
          Proveedor guardado correctamente.
        </div>
      )}

      <section className="rounded-lg border bg-card p-5 space-y-4">
        <h3 className="font-semibold">Datos generales</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="sm:col-span-2">
            <Label htmlFor="nombre">Nombre / Razón social</Label>
            <Input id="nombre" name="nombre" defaultValue={proveedor?.nombre} required />
            <Err msgs={state.fieldErrors?.nombre} />
          </div>
          <div>
            <Label htmlFor="contacto">Persona de contacto</Label>
            <Input id="contacto" name="contacto" defaultValue={proveedor?.contacto ?? ""} />
          </div>
          <div>
            <Label htmlFor="diasCredito">Días de crédito</Label>
            <Input
              id="diasCredito"
              name="diasCredito"
              type="number"
              min={0}
              max={365}
              defaultValue={proveedor?.diasCredito ?? 0}
            />
            <p className="text-xs text-muted-foreground mt-1">
              Reservado para Fase 2 (CxP); 0 = contado.
            </p>
          </div>
          <div>
            <Label htmlFor="email">Email</Label>
            <Input id="email" name="email" type="email" defaultValue={proveedor?.email ?? ""} />
            <Err msgs={state.fieldErrors?.email} />
          </div>
          <div>
            <Label htmlFor="telefono">Teléfono</Label>
            <Input id="telefono" name="telefono" defaultValue={proveedor?.telefono ?? ""} />
          </div>
          {isEdit && (
            <label className="flex items-center gap-2 text-sm sm:col-span-2">
              <input
                type="checkbox"
                name="activo"
                defaultChecked={proveedor?.activo ?? true}
                className="size-4"
              />
              Proveedor activo (desactivar es baja lógica)
            </label>
          )}
        </div>
      </section>

      <section className="rounded-lg border bg-card p-5 space-y-4">
        <h3 className="font-semibold">Datos fiscales</h3>
        <p className="text-xs text-muted-foreground">
          Necesarios para conciliar facturas recibidas (CFDI). Pueden completarse después.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="rfc">RFC</Label>
            <Input
              id="rfc"
              name="rfc"
              defaultValue={proveedor?.rfc ?? ""}
              placeholder="XAXX010101000"
              className="uppercase font-mono"
            />
            <Err msgs={state.fieldErrors?.rfc} />
          </div>
          <div>
            <Label htmlFor="codigoPostal">Código postal</Label>
            <Input
              id="codigoPostal"
              name="codigoPostal"
              defaultValue={proveedor?.codigoPostal ?? ""}
              placeholder="00000"
              maxLength={5}
            />
            <Err msgs={state.fieldErrors?.codigoPostal} />
          </div>
          <div>
            <Label htmlFor="regimenFiscal">Régimen fiscal</Label>
            <Input
              id="regimenFiscal"
              name="regimenFiscal"
              defaultValue={proveedor?.regimenFiscal ?? ""}
              placeholder="601, 612, 626…"
            />
          </div>
          <div className="sm:col-span-2">
            <Label htmlFor="direccion">Dirección</Label>
            <Input id="direccion" name="direccion" defaultValue={proveedor?.direccion ?? ""} />
          </div>
        </div>
      </section>

      <section className="rounded-lg border bg-card p-5 space-y-4">
        <h3 className="font-semibold">Notas internas</h3>
        <Textarea
          id="notas"
          name="notas"
          defaultValue={proveedor?.notas ?? ""}
          rows={3}
          placeholder="Observaciones para el equipo."
        />
      </section>

      <div className="flex gap-3 justify-end">
        <Button variant="outline" asChild>
          <Link href="/proveedores">Cancelar</Link>
        </Button>
        <Submit label={isEdit ? "Guardar cambios" : "Crear proveedor"} />
      </div>
    </form>
  );
}
