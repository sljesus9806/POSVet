"use client";

import { useActionState, useEffect, useMemo, useState } from "react";
import { useFormStatus } from "react-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { registrarFacturaAction, type FormState } from "../../actions";

type ProveedorOpt = { id: string; codigo: string; nombre: string };
type OcOpt = { id: string; folio: string; subtotal: number; iva: number; total: number };

const initial: FormState = { ok: false };

function Submit({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? "Guardando…" : label}
    </Button>
  );
}

export function NuevaFacturaForm({
  proveedores,
  proveedorIdInicial,
  ocPrecargada,
}: {
  proveedores: ProveedorOpt[];
  proveedorIdInicial: string | null;
  ocPrecargada: OcOpt | null;
}) {
  const [state, action] = useActionState(registrarFacturaAction, initial);
  const [proveedorId, setProveedorId] = useState(proveedorIdInicial ?? "");
  const [ocs, setOcs] = useState<OcOpt[]>(ocPrecargada ? [ocPrecargada] : []);
  const [ocId, setOcId] = useState(ocPrecargada?.id ?? "");

  const [subtotal, setSubtotal] = useState(ocPrecargada?.subtotal ?? 0);
  const [iva, setIva] = useState(ocPrecargada?.iva ?? 0);
  const totalCalculado = useMemo(() => (subtotal + iva).toFixed(2), [subtotal, iva]);

  // Cargar OCs del proveedor
  useEffect(() => {
    if (!proveedorId) {
      setOcs([]);
      setOcId("");
      return;
    }
    let cancel = false;
    fetch(`/api/cuentas-pagar/ocs?proveedorId=${proveedorId}`)
      .then((r) => r.json())
      .then((data: OcOpt[]) => {
        if (!cancel) setOcs(data);
      })
      .catch(() => undefined);
    return () => {
      cancel = true;
    };
  }, [proveedorId]);

  function aplicarOc(id: string) {
    setOcId(id);
    const oc = ocs.find((o) => o.id === id);
    if (oc) {
      setSubtotal(oc.subtotal);
      setIva(oc.iva);
    }
  }

  const hoy = new Date().toISOString().slice(0, 10);
  const en30dias = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

  return (
    <form action={action} className="space-y-6">
      {state.error && (
        <div className="rounded-md border border-destructive/50 bg-destructive/10 text-destructive text-sm px-3 py-2">
          {state.error}
        </div>
      )}

      <section className="rounded-lg border bg-card p-5 space-y-4">
        <h3 className="font-semibold">Datos de la factura</h3>
        <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
          <div className="sm:col-span-6">
            <Label htmlFor="proveedorId">Proveedor</Label>
            <select
              id="proveedorId"
              name="proveedorId"
              required
              value={proveedorId}
              onChange={(e) => setProveedorId(e.target.value)}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            >
              <option value="" disabled>
                Selecciona…
              </option>
              {proveedores.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.codigo} · {p.nombre}
                </option>
              ))}
            </select>
          </div>
          <div className="sm:col-span-6">
            <Label htmlFor="folioProveedor">Folio del proveedor</Label>
            <Input
              id="folioProveedor"
              name="folioProveedor"
              placeholder="Folio o UUID CFDI"
              required
              maxLength={80}
            />
          </div>

          <div className="sm:col-span-6">
            <Label htmlFor="ordenCompraId">OC vinculada (opcional)</Label>
            <select
              id="ordenCompraId"
              name="ordenCompraId"
              value={ocId}
              onChange={(e) => aplicarOc(e.target.value)}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            >
              <option value="">— Sin OC —</option>
              {ocs.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.folio}
                </option>
              ))}
            </select>
          </div>
          <div className="sm:col-span-3">
            <Label htmlFor="fechaEmision">Fecha emisión</Label>
            <Input
              id="fechaEmision"
              name="fechaEmision"
              type="date"
              defaultValue={hoy}
              required
            />
          </div>
          <div className="sm:col-span-3">
            <Label htmlFor="fechaVencimiento">Vencimiento</Label>
            <Input
              id="fechaVencimiento"
              name="fechaVencimiento"
              type="date"
              defaultValue={en30dias}
              required
            />
          </div>

          <div className="sm:col-span-4">
            <Label htmlFor="subtotal">Subtotal</Label>
            <Input
              id="subtotal"
              name="subtotal"
              type="number"
              step="0.01"
              min={0}
              value={subtotal}
              onChange={(e) => setSubtotal(Number(e.target.value))}
              required
            />
          </div>
          <div className="sm:col-span-4">
            <Label htmlFor="iva">IVA</Label>
            <Input
              id="iva"
              name="iva"
              type="number"
              step="0.01"
              min={0}
              value={iva}
              onChange={(e) => setIva(Number(e.target.value))}
              required
            />
          </div>
          <div className="sm:col-span-4">
            <Label htmlFor="total">Total</Label>
            <Input
              id="total"
              name="total"
              type="number"
              step="0.01"
              min="0.01"
              defaultValue={totalCalculado}
              key={totalCalculado /* re-render cuando cambia subtotal/iva */}
              required
            />
            <p className="text-xs text-muted-foreground mt-1">
              Sugerido: <span className="tabular-nums">{totalCalculado}</span> (ajustable)
            </p>
          </div>

          <div className="sm:col-span-12">
            <Label htmlFor="observaciones">Observaciones</Label>
            <Input id="observaciones" name="observaciones" placeholder="opcional" />
          </div>
        </div>
      </section>

      <div className="flex justify-end gap-2">
        <Button variant="outline" type="reset">
          Limpiar
        </Button>
        <Submit label="Capturar factura" />
      </div>
    </form>
  );
}
