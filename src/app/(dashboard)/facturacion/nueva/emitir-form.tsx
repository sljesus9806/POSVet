"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
// Catálogos = datos puros (sin código de servidor), por eso se importan del
// archivo directo y no del index del módulo (que arrastraría Prisma al cliente).
import {
  FORMAS_PAGO,
  METODOS_PAGO,
  REGIMENES_FISCALES,
  USOS_CFDI,
} from "@/lib/modules/facturacion/catalogos";
import { emitirFacturaAction, type FormState } from "../actions";

const initial: FormState = { ok: false };

type Prefill = {
  ventaId: string;
  receptorRfc: string;
  receptorNombre: string;
  receptorRegimen: string;
  receptorUsoCfdi: string;
  receptorCp: string;
  formaPago: string;
  metodoPago: string;
};

function Submit() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? "Timbrando…" : "Timbrar factura"}
    </Button>
  );
}

function Err({ msgs }: { msgs?: string[] }) {
  if (!msgs?.length) return null;
  return <p className="text-xs text-destructive mt-1">{msgs.join(" · ")}</p>;
}

const selectCls =
  "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm";

export function EmitirFacturaForm({
  prefill,
  clienteNombre,
}: {
  prefill: Prefill;
  clienteNombre: string | null;
}) {
  const [state, action] = useActionState(emitirFacturaAction, initial);

  return (
    <form action={action} className="space-y-6">
      <input type="hidden" name="ventaId" value={prefill.ventaId} />

      {state.error && (
        <div className="rounded-md border border-destructive/50 bg-destructive/10 text-destructive text-sm px-3 py-2">
          {state.error}
        </div>
      )}

      <section className="rounded-lg border bg-card p-5 space-y-4">
        <div>
          <h3 className="font-semibold">Datos fiscales del cliente</h3>
          <p className="text-xs text-muted-foreground">
            {clienteNombre
              ? `Prellenados desde el cliente "${clienteNombre}". Verifícalos contra su Constancia de Situación Fiscal.`
              : "La venta fue a público en general. Pide al cliente su RFC, razón social, código postal y régimen (vienen en su Constancia de Situación Fiscal)."}
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="sm:col-span-2">
            <Label htmlFor="receptorNombre">Nombre / Razón social</Label>
            <Input
              id="receptorNombre"
              name="receptorNombre"
              defaultValue={prefill.receptorNombre}
              placeholder="Tal como aparece en el SAT (sin S.A. de C.V.)"
              className="uppercase"
              required
            />
            <Err msgs={state.fieldErrors?.receptorNombre} />
          </div>
          <div>
            <Label htmlFor="receptorRfc">RFC</Label>
            <Input
              id="receptorRfc"
              name="receptorRfc"
              defaultValue={prefill.receptorRfc}
              placeholder="XAXX010101000"
              className="uppercase font-mono"
              required
            />
            <Err msgs={state.fieldErrors?.receptorRfc} />
          </div>
          <div>
            <Label htmlFor="receptorCp">Código postal</Label>
            <Input
              id="receptorCp"
              name="receptorCp"
              defaultValue={prefill.receptorCp}
              placeholder="00000"
              maxLength={5}
              inputMode="numeric"
              required
            />
            <Err msgs={state.fieldErrors?.receptorCp} />
          </div>
          <div>
            <Label htmlFor="receptorRegimen">Régimen fiscal</Label>
            <select
              id="receptorRegimen"
              name="receptorRegimen"
              defaultValue={prefill.receptorRegimen || ""}
              className={selectCls}
              required
            >
              <option value="" disabled>
                Selecciona…
              </option>
              {REGIMENES_FISCALES.map((r) => (
                <option key={r.clave} value={r.clave}>
                  {r.descripcion}
                </option>
              ))}
            </select>
            <Err msgs={state.fieldErrors?.receptorRegimen} />
          </div>
          <div>
            <Label htmlFor="receptorUsoCfdi">Uso de la factura (CFDI)</Label>
            <select
              id="receptorUsoCfdi"
              name="receptorUsoCfdi"
              defaultValue={prefill.receptorUsoCfdi || "G03"}
              className={selectCls}
              required
            >
              {USOS_CFDI.map((u) => (
                <option key={u.clave} value={u.clave}>
                  {u.descripcion}
                </option>
              ))}
            </select>
            <Err msgs={state.fieldErrors?.receptorUsoCfdi} />
          </div>
        </div>
      </section>

      <section className="rounded-lg border bg-card p-5 space-y-4">
        <h3 className="font-semibold">Pago</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="formaPago">Forma de pago</Label>
            <select
              id="formaPago"
              name="formaPago"
              defaultValue={prefill.formaPago}
              className={selectCls}
            >
              {FORMAS_PAGO.map((f) => (
                <option key={f.clave} value={f.clave}>
                  {f.descripcion}
                </option>
              ))}
            </select>
            <Err msgs={state.fieldErrors?.formaPago} />
          </div>
          <div>
            <Label htmlFor="metodoPago">Método de pago</Label>
            <select
              id="metodoPago"
              name="metodoPago"
              defaultValue={prefill.metodoPago}
              className={selectCls}
            >
              {METODOS_PAGO.map((m) => (
                <option key={m.clave} value={m.clave}>
                  {m.descripcion}
                </option>
              ))}
            </select>
            <Err msgs={state.fieldErrors?.metodoPago} />
          </div>
        </div>
        <p className="text-xs text-muted-foreground">
          Los productos y los importes se toman automáticamente de la venta.
        </p>
      </section>

      <div className="flex gap-3 justify-end">
        <Button variant="outline" asChild>
          <Link href="/facturacion">Cancelar</Link>
        </Button>
        <Submit />
      </div>
    </form>
  );
}
