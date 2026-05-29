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
import { registrarAbonoAction, type FormState } from "../../actions";

type ClienteOpt = { id: string; codigo: string; nombre: string; saldoActual: number };
type VentaPend = {
  ventaId: string;
  folio: string;
  fechaVenta: string;
  saldoCredito: number;
  montoCredito: number;
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
      {pending ? "Guardando…" : "Registrar abono"}
    </Button>
  );
}

export function NuevoAbonoForm({
  clientes,
  clienteIdInicial,
  ventaIdInicial,
  ventasIniciales,
}: {
  clientes: ClienteOpt[];
  clienteIdInicial: string | null;
  ventaIdInicial: string | null;
  ventasIniciales: VentaPend[];
}) {
  const [state, action] = useActionState(registrarAbonoAction, initial);
  const [clienteId, setClienteId] = useState(clienteIdInicial ?? "");
  const [ventas, setVentas] = useState<VentaPend[]>(ventasIniciales);
  const [monto, setMonto] = useState(0);
  const [aplic, setAplic] = useState<Record<string, number>>(() => {
    if (ventaIdInicial) {
      const v = ventasIniciales.find((x) => x.ventaId === ventaIdInicial);
      if (v) return { [v.ventaId]: v.saldoCredito };
    }
    return {};
  });

  useEffect(() => {
    if (ventaIdInicial) {
      const v = ventasIniciales.find((x) => x.ventaId === ventaIdInicial);
      if (v) setMonto(v.saldoCredito);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ventaIdInicial]);

  useEffect(() => {
    if (!clienteId) {
      setVentas([]);
      setAplic({});
      return;
    }
    if (clienteId === clienteIdInicial) return;
    let cancel = false;
    fetch(`/api/cobranza/ventas-credito?clienteId=${clienteId}`)
      .then((r) => r.json())
      .then((data: Array<{ ventaId: string; folio: string; fechaVenta: string; saldoCredito: number; montoCredito: number }>) => {
        if (!cancel) {
          setVentas(data);
          setAplic({});
        }
      })
      .catch(() => undefined);
    return () => {
      cancel = true;
    };
  }, [clienteId, clienteIdInicial]);

  function actualizar(ventaId: string, valor: number) {
    setAplic({ ...aplic, [ventaId]: valor });
  }

  function aplicarAuto() {
    let restante = monto;
    const next: Record<string, number> = {};
    for (const v of ventas) {
      if (restante <= 0) break;
      const aplicarV = Math.min(restante, v.saldoCredito);
      if (aplicarV > 0) {
        next[v.ventaId] = Number(aplicarV.toFixed(2));
        restante -= aplicarV;
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
        <h3 className="font-semibold">Datos del abono</h3>
        <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
          <div className="sm:col-span-5">
            <Label htmlFor="clienteId">Cliente</Label>
            <select
              id="clienteId"
              name="clienteId"
              required
              value={clienteId}
              onChange={(e) => setClienteId(e.target.value)}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            >
              <option value="" disabled>
                Selecciona…
              </option>
              {clientes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.codigo} · {c.nombre}
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
              defaultValue="EFECTIVO"
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
            <Input id="referencia" name="referencia" placeholder="# cheque, transferencia…" />
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
            <h3 className="font-semibold">Distribución a ventas a crédito</h3>
            <p className="text-xs text-muted-foreground">
              Indica cuánto se aplica a cada venta pendiente. La suma debe igualar el monto.
            </p>
          </div>
          {ventas.length > 0 && monto > 0 && (
            <Button type="button" variant="outline" size="sm" onClick={aplicarAuto}>
              Aplicar automáticamente (más antigua primero)
            </Button>
          )}
        </div>

        {!clienteId ? (
          <p className="text-sm text-muted-foreground py-4">Selecciona un cliente primero.</p>
        ) : ventas.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4">
            Este cliente no tiene ventas a crédito pendientes.
          </p>
        ) : (
          <div className="rounded-md border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Folio</TableHead>
                  <TableHead>Fecha</TableHead>
                  <TableHead className="text-right">Saldo</TableHead>
                  <TableHead className="text-right">Aplicar</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {ventas.map((v) => (
                  <TableRow key={v.ventaId}>
                    <TableCell className="font-mono text-xs">{v.folio}</TableCell>
                    <TableCell className="text-sm">{fmtFecha(v.fechaVenta)}</TableCell>
                    <TableCell className="text-right tabular-nums text-sm">
                      {fmtMoneda(v.saldoCredito)}
                    </TableCell>
                    <TableCell className="text-right">
                      <input type="hidden" name="aplVentaId" value={v.ventaId} />
                      <Input
                        name="aplMonto"
                        type="number"
                        step="0.01"
                        min={0}
                        max={v.saldoCredito}
                        value={aplic[v.ventaId] ?? ""}
                        onChange={(e) => actualizar(v.ventaId, Number(e.target.value || 0))}
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

        <div className="flex justify-end text-sm tabular-nums">
          <div className="min-w-[260px] space-y-1">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Monto del abono</span>
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
                  Math.abs(diferencia) <= 0.01 ? "text-green-700" : "text-destructive"
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
