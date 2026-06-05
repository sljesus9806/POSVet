"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  actualizarClienteAction,
  crearClienteAction,
  type FormState,
} from "./actions";
import type { ClienteDetalle } from "@/lib/modules/clientes";

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

export function ClienteForm({ cliente }: { cliente?: ClienteDetalle }) {
  const isEdit = !!cliente;
  const action = isEdit ? actualizarClienteAction : crearClienteAction;
  const [state, formAction] = useActionState(action, initial);

  return (
    <form action={formAction} className="space-y-6">
      {isEdit && <input type="hidden" name="id" value={cliente!.id} />}

      {state.error && (
        <div className="rounded-md border border-destructive/50 bg-destructive/10 text-destructive text-sm px-3 py-2">
          {state.error}
        </div>
      )}
      {state.ok && (
        <div className="rounded-md border border-green-600/50 bg-green-600/10 text-green-700 text-sm px-3 py-2">
          Cliente guardado correctamente.
        </div>
      )}

      <section className="rounded-lg border bg-card p-5 space-y-4">
        <h3 className="font-semibold">Datos generales</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="sm:col-span-2">
            <Label htmlFor="nombre">Nombre / Razón social</Label>
            <Input id="nombre" name="nombre" defaultValue={cliente?.nombre} required />
            <Err msgs={state.fieldErrors?.nombre} />
          </div>
          <div>
            <Label htmlFor="tipoCliente">Tipo de cliente</Label>
            <select
              id="tipoCliente"
              name="tipoCliente"
              defaultValue={cliente?.tipoCliente ?? "PUBLICO"}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            >
              <option value="PUBLICO">Público general</option>
              <option value="MAYOREO">Mayoreo</option>
              <option value="DISTRIBUIDOR">Distribuidor</option>
            </select>
          </div>
          <div>
            <Label htmlFor="tipoPrecio">Precio override (opcional)</Label>
            <select
              id="tipoPrecio"
              name="tipoPrecio"
              defaultValue={cliente?.tipoPrecio ?? ""}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            >
              <option value="">Derivar del tipo</option>
              <option value="PUBLICO">PUBLICO</option>
              <option value="MAYOREO">MAYOREO</option>
              <option value="DISTRIBUIDOR">DISTRIBUIDOR</option>
            </select>
            <p className="text-xs text-muted-foreground mt-1">
              Si lo dejas en blanco, se usa el precio del tipo de cliente.
            </p>
          </div>
          <div>
            <Label htmlFor="email">Email</Label>
            <Input id="email" name="email" type="email" defaultValue={cliente?.email ?? ""} />
            <Err msgs={state.fieldErrors?.email} />
          </div>
          <div>
            <Label htmlFor="telefono">Teléfono</Label>
            <Input id="telefono" name="telefono" defaultValue={cliente?.telefono ?? ""} />
          </div>
          {isEdit && (
            <label className="flex items-center gap-2 text-sm sm:col-span-2">
              <input
                type="checkbox"
                name="activo"
                defaultChecked={cliente?.activo ?? true}
                className="size-4"
              />
              Cliente activo (desactivar es baja lógica, conserva el historial)
            </label>
          )}
        </div>
      </section>

      <section className="rounded-lg border bg-card p-5 space-y-4">
        <h3 className="font-semibold">Datos fiscales (CFDI)</h3>
        <p className="text-xs text-muted-foreground">
          Necesarios solo si el cliente requiere factura. Pueden completarse después.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="rfc">RFC</Label>
            <Input
              id="rfc"
              name="rfc"
              defaultValue={cliente?.rfc ?? ""}
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
              defaultValue={cliente?.codigoPostal ?? ""}
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
              defaultValue={cliente?.regimenFiscal ?? ""}
              placeholder="601, 612, 626…"
            />
          </div>
          <div>
            <Label htmlFor="usoCFDI">Uso de CFDI</Label>
            <Input
              id="usoCFDI"
              name="usoCFDI"
              defaultValue={cliente?.usoCFDI ?? ""}
              placeholder="G03, P01…"
            />
          </div>
        </div>
      </section>

      <section className="rounded-lg border bg-card p-5 space-y-4">
        <h3 className="font-semibold">Crédito</h3>
        <p className="text-xs text-muted-foreground">
          Línea de crédito autorizada. Si es 0, este cliente no podrá pagar a crédito en el POS.
          {isEdit && (
            <>
              {" "}Saldo actual del cliente:{" "}
              <strong className="tabular-nums">
                {new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN" }).format(cliente?.saldoActual ?? 0)}
              </strong>
              {" "}(no se edita directamente; cambia con ventas a crédito y abonos).
            </>
          )}
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <Label htmlFor="lineaCredito">Línea de crédito</Label>
            <Input
              id="lineaCredito"
              name="lineaCredito"
              type="number"
              step="0.01"
              min={0}
              defaultValue={cliente?.lineaCredito ?? 0}
            />
            <Err msgs={state.fieldErrors?.lineaCredito} />
          </div>
          <div>
            <Label htmlFor="diasCredito">Días de crédito</Label>
            <Input
              id="diasCredito"
              name="diasCredito"
              type="number"
              min={0}
              max={365}
              defaultValue={cliente?.diasCredito ?? 0}
            />
            <Err msgs={state.fieldErrors?.diasCredito} />
          </div>
        </div>
      </section>

      <section className="rounded-lg border bg-card p-5 space-y-4">
        <h3 className="font-semibold">Notas internas</h3>
        <Textarea
          id="notas"
          name="notas"
          defaultValue={cliente?.notas ?? ""}
          rows={3}
          placeholder="Observaciones para el equipo (no visibles al cliente)."
        />
      </section>

      <div className="flex gap-3 justify-end">
        <Button variant="outline" asChild>
          <Link href="/clientes">Cancelar</Link>
        </Button>
        <Submit label={isEdit ? "Guardar cambios" : "Crear cliente"} />
      </div>
    </form>
  );
}
