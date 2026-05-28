"use client";

import { useActionState, useEffect, useMemo, useState } from "react";
import { useFormStatus } from "react-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { registrarPagoAction, type FormState } from "../../actions";

type ProveedorOpt = { id: string; codigo: string; nombre: string };
type FacturaPend = {
  id: string;
  folio: string;
  folioProveedor: string;
  fechaVencimiento: string;
  saldo: number;
  total: number;
};

const initial: FormState = { ok: false };

function fmtMoneda(n: number) {
  return new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN" }).format(n);
}
function fmtFecha(s: string) {
  return new Intl.DateTimeFormat("es-MX", { dateStyle: "medium" }).format(new Date(s));
}

function Submit() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? "Guardando…" : "Registrar pago"}
    </Button>
  );
}

export function NuevoPagoForm({
  proveedores,
  proveedorIdInicial,
  facturaIdInicial,
  pendientesIniciales,
}: {
  proveedores: ProveedorOpt[];
  proveedorIdInicial: string | null;
  facturaIdInicial: string | null;
  pendientesIniciales: FacturaPend[];
}) {
  const [state, action] = useActionState(registrarPagoAction, initial);
  const [proveedorId, setProveedorId] = useState(proveedorIdInicial ?? "");
  const [pendientes, setPendientes] = useState<FacturaPend[]>(pendientesIniciales);
  const [monto, setMonto] = useState(0);
  const [aplic, setAplic] = useState<Record<string, number>>(() => {
    // Si vino facturaId, pre-seleccionar con su saldo
    if (facturaIdInicial) {
      const f = pendientesIniciales.find((p) => p.id === facturaIdInicial);
      if (f) {
        return { [f.id]: f.saldo };
      }
    }
    return {};
  });

  useEffect(() => {
    // Si el usuario pre-llenó la aplicación desde la URL, sincroniza el monto al saldo
    if (facturaIdInicial) {
      const f = pendientesIniciales.find((p) => p.id === facturaIdInicial);
      if (f) setMonto(f.saldo);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [facturaIdInicial]);

  useEffect(() => {
    if (!proveedorId) {
      setPendientes([]);
      setAplic({});
      return;
    }
    if (proveedorId === proveedorIdInicial) {
      return; // ya está cargado del SSR
    }
    let cancel = false;
    fetch(`/api/cuentas-pagar/facturas-pendientes?proveedorId=${proveedorId}`)
      .then((r) => r.json())
      .then((data: Array<Omit<FacturaPend, "fechaVencimiento"> & { fechaVencimiento: string }>) => {
        if (!cancel) {
          setPendientes(data);
          setAplic({});
        }
      })
      .catch(() => undefined);
    return () => {
      cancel = true;
    };
  }, [proveedorId, proveedorIdInicial]);

  function actualizarAplic(facturaId: string, valor: number) {
    setAplic({ ...aplic, [facturaId]: valor });
  }

  function aplicarAuto() {
    // Distribuye el monto en orden de vencimiento hasta agotar
    let restante = monto;
    const next: Record<string, number> = {};
    for (const f of pendientes) {
      if (restante <= 0) break;
      const aplicarF = Math.min(restante, f.saldo);
      if (aplicarF > 0) {
        next[f.id] = Number(aplicarF.toFixed(2));
        restante -= aplicarF;
      }
    }
    setAplic(next);
  }

  const sumaAplic = useMemo(
    () => Object.values(aplic).reduce((acc, v) => acc + (v || 0), 0),
    [aplic],
  );
  const diferencia = Number((monto - sumaAplic).toFixed(2));

  const hoy = new Date().toISOString().slice(0, 10);

  return (
    <form action={action} className="space-y-6">
      {state.error && (
        <div className="rounded-md border border-destructive/50 bg-destructive/10 text-destructive text-sm px-3 py-2">
          {state.error}
        </div>
      )}

      <section className="rounded-lg border bg-card p-5 space-y-4">
        <h3 className="font-semibold">Datos del pago</h3>
        <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
          <div className="sm:col-span-5">
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
          <div className="sm:col-span-3">
            <Label htmlFor="fecha">Fecha</Label>
            <Input id="fecha" name="fecha" type="date" defaultValue={hoy} required />
          </div>
          <div className="sm:col-span-2">
            <Label htmlFor="formaPago">Forma</Label>
            <select
              id="formaPago"
              name="formaPago"
              required
              defaultValue="TRANSFERENCIA"
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            >
              <option value="EFECTIVO">Efectivo</option>
              <option value="TRANSFERENCIA">Transferencia</option>
              <option value="CHEQUE">Cheque</option>
              <option value="TARJETA">Tarjeta</option>
              <option value="OTRO">Otro</option>
            </select>
          </div>
          <div className="sm:col-span-2">
            <Label htmlFor="monto">Monto</Label>
            <Input
              id="monto"
              name="monto"
              type="number"
              step="0.01"
              min="0.01"
              value={monto || ""}
              onChange={(e) => setMonto(Number(e.target.value))}
              required
            />
          </div>
          <div className="sm:col-span-6">
            <Label htmlFor="referencia">Referencia</Label>
            <Input id="referencia" name="referencia" placeholder="# cheque, # transferencia…" />
          </div>
          <div className="sm:col-span-6">
            <Label htmlFor="observaciones">Observaciones</Label>
            <Input id="observaciones" name="observaciones" placeholder="opcional" />
          </div>
        </div>
      </section>

      <section className="rounded-lg border bg-card p-5 space-y-4">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div>
            <h3 className="font-semibold">Distribución a facturas</h3>
            <p className="text-xs text-muted-foreground">
              Indica cuánto se aplica a cada factura pendiente. La suma debe igualar el monto del pago.
            </p>
          </div>
          {pendientes.length > 0 && monto > 0 && (
            <Button type="button" variant="outline" size="sm" onClick={aplicarAuto}>
              Aplicar automáticamente (por vencimiento)
            </Button>
          )}
        </div>

        {!proveedorId ? (
          <p className="text-sm text-muted-foreground py-4">Selecciona un proveedor primero.</p>
        ) : pendientes.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4">
            Este proveedor no tiene facturas pendientes.
          </p>
        ) : (
          <div className="rounded-md border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Folio</TableHead>
                  <TableHead>Folio prov.</TableHead>
                  <TableHead>Vence</TableHead>
                  <TableHead className="text-right">Saldo</TableHead>
                  <TableHead className="text-right">Aplicar</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pendientes.map((f) => (
                  <TableRow key={f.id}>
                    <TableCell className="font-mono text-xs">{f.folio}</TableCell>
                    <TableCell className="font-mono text-xs">{f.folioProveedor}</TableCell>
                    <TableCell className="text-sm">{fmtFecha(f.fechaVencimiento)}</TableCell>
                    <TableCell className="text-right tabular-nums text-sm">
                      {fmtMoneda(f.saldo)}
                    </TableCell>
                    <TableCell className="text-right">
                      <input type="hidden" name="aplFacturaId" value={f.id} />
                      <Input
                        name="aplMonto"
                        type="number"
                        step="0.01"
                        min={0}
                        max={f.saldo}
                        value={aplic[f.id] ?? ""}
                        onChange={(e) => actualizarAplic(f.id, Number(e.target.value || 0))}
                        placeholder="0"
                        className="h-8 text-right tabular-nums w-28 ml-auto"
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}

        <div className="flex justify-end text-sm tabular-nums space-y-1">
          <div className="min-w-[260px] space-y-1">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Monto del pago</span>
              <span>{fmtMoneda(monto)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Suma de distribución</span>
              <span>{fmtMoneda(sumaAplic)}</span>
            </div>
            <div className="flex justify-between font-medium border-t pt-1">
              <span>Diferencia</span>
              <span
                className={
                  Math.abs(diferencia) <= 0.01
                    ? "text-green-700"
                    : "text-destructive"
                }
              >
                {fmtMoneda(diferencia)}
              </span>
            </div>
          </div>
        </div>
      </section>

      <div className="flex justify-end gap-2">
        <Submit />
      </div>
    </form>
  );
}
