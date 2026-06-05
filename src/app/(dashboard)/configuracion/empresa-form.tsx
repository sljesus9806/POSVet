"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { actualizarEmpresaAction, type FormState } from "./actions";
import type { EmpresaDetalle } from "@/lib/modules/configuracion";

const initial: FormState = { ok: false };

function Submit() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? "Guardando…" : "Guardar cambios"}
    </Button>
  );
}

function Err({ msgs }: { msgs?: string[] }) {
  if (!msgs?.length) return null;
  return <p className="text-xs text-destructive mt-1">{msgs.join(" · ")}</p>;
}

export function EmpresaForm({ empresa }: { empresa: EmpresaDetalle }) {
  const [state, formAction] = useActionState(actualizarEmpresaAction, initial);

  return (
    <form action={formAction} className="space-y-6">
      <input type="hidden" name="id" value={empresa.id} />

      {state.error && (
        <div className="rounded-md border border-destructive/50 bg-destructive/10 text-destructive text-sm px-3 py-2">
          {state.error}
        </div>
      )}
      {state.ok && (
        <div className="rounded-md border border-green-600/50 bg-green-600/10 text-green-700 text-sm px-3 py-2">
          Datos de empresa actualizados.
        </div>
      )}

      <section className="rounded-lg border bg-card p-5 space-y-4">
        <h3 className="font-semibold">Datos fiscales</h3>
        <p className="text-xs text-muted-foreground">
          Estos datos se usan para emitir CFDI (Fase 3). RFC, razón social y régimen fiscal
          son los que verá el SAT en cada factura.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="rfc">RFC</Label>
            <Input
              id="rfc"
              name="rfc"
              defaultValue={empresa.rfc}
              required
              placeholder="XAXX010101000"
              className="uppercase font-mono"
              maxLength={13}
            />
            <Err msgs={state.fieldErrors?.rfc} />
          </div>
          <div>
            <Label htmlFor="codigoPostal">Código postal del domicilio fiscal</Label>
            <Input
              id="codigoPostal"
              name="codigoPostal"
              defaultValue={empresa.codigoPostal ?? ""}
              placeholder="00000"
              maxLength={5}
            />
            <Err msgs={state.fieldErrors?.codigoPostal} />
          </div>
          <div className="sm:col-span-2">
            <Label htmlFor="razonSocial">Razón social</Label>
            <Input
              id="razonSocial"
              name="razonSocial"
              defaultValue={empresa.razonSocial}
              required
              placeholder="Mi Negocio SA de CV"
            />
            <Err msgs={state.fieldErrors?.razonSocial} />
          </div>
          <div>
            <Label htmlFor="regimenFiscal">Régimen fiscal (clave SAT)</Label>
            <Input
              id="regimenFiscal"
              name="regimenFiscal"
              defaultValue={empresa.regimenFiscal ?? ""}
              placeholder="601, 612, 626…"
              maxLength={3}
            />
            <Err msgs={state.fieldErrors?.regimenFiscal} />
          </div>
        </div>
      </section>

      <section className="rounded-lg border bg-card p-5 space-y-4">
        <h3 className="font-semibold">Contacto y dirección</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              name="email"
              type="email"
              defaultValue={empresa.email ?? ""}
            />
            <Err msgs={state.fieldErrors?.email} />
          </div>
          <div>
            <Label htmlFor="telefono">Teléfono</Label>
            <Input id="telefono" name="telefono" defaultValue={empresa.telefono ?? ""} />
          </div>
          <div className="sm:col-span-2">
            <Label htmlFor="direccion">Dirección</Label>
            <Textarea
              id="direccion"
              name="direccion"
              defaultValue={empresa.direccion ?? ""}
              rows={2}
            />
          </div>
        </div>
      </section>

      <section className="rounded-lg border bg-card p-5 space-y-4">
        <h3 className="font-semibold">Marca</h3>
        <div>
          <Label htmlFor="logoUrl">URL del logo</Label>
          <Input
            id="logoUrl"
            name="logoUrl"
            type="url"
            defaultValue={empresa.logoUrl ?? ""}
            placeholder="https://..."
          />
          <p className="text-xs text-muted-foreground mt-1">
            Aparece en el ticket y la factura. Sube tu logo a un host público y pega la URL.
          </p>
          <Err msgs={state.fieldErrors?.logoUrl} />
        </div>
      </section>

      <div className="flex justify-end">
        <Submit />
      </div>
    </form>
  );
}
