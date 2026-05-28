"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import { PackageCheck } from "lucide-react";
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
import { registrarRecepcionAction, type FormState } from "../actions";

type LineaPendiente = {
  id: string;
  productoSku: string;
  productoNombre: string;
  unidadMedida: string;
  pendiente: number;
  costoUnitario: number;
};

type LineaLocal = {
  ocLineaId: string;
  productoSku: string;
  productoNombre: string;
  unidadMedida: string;
  pendiente: number;
  cantidad: number;
  costoUnitario: number;
  lote: string;
  caducidad: string;
};

const initial: FormState = { ok: false };

function Submit({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      <PackageCheck className="size-4" />
      {pending ? "Registrando…" : label}
    </Button>
  );
}

export function RecepcionForm({
  ordenCompraId,
  lineas,
}: {
  ordenCompraId: string;
  lineas: LineaPendiente[];
}) {
  const [state, action] = useActionState(registrarRecepcionAction, initial);
  const [filas, setFilas] = useState<LineaLocal[]>(() =>
    lineas.map((l) => ({
      ocLineaId: l.id,
      productoSku: l.productoSku,
      productoNombre: l.productoNombre,
      unidadMedida: l.unidadMedida,
      pendiente: l.pendiente,
      cantidad: 0,
      costoUnitario: l.costoUnitario,
      lote: "",
      caducidad: "",
    })),
  );

  function actualizar(idx: number, patch: Partial<LineaLocal>) {
    setFilas(filas.map((f, i) => (i === idx ? { ...f, ...patch } : f)));
  }

  function recibirTodo() {
    setFilas(filas.map((f) => ({ ...f, cantidad: f.pendiente })));
  }

  const totalRecibido = filas.reduce((acc, f) => acc + f.cantidad, 0);

  return (
    <form action={action} className="rounded-lg border bg-card p-5 space-y-4">
      <input type="hidden" name="ordenCompraId" value={ordenCompraId} />
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h3 className="font-semibold">Registrar recepción</h3>
          <p className="text-xs text-muted-foreground">
            Indica la cantidad realmente recibida por línea. El stock de la ubicación destino se
            actualiza automáticamente al guardar.
          </p>
        </div>
        <Button type="button" variant="outline" size="sm" onClick={recibirTodo}>
          Recibir todo lo pendiente
        </Button>
      </div>

      {state.error && (
        <div className="rounded-md border border-destructive/50 bg-destructive/10 text-destructive text-sm px-3 py-2">
          {state.error}
        </div>
      )}

      <div className="rounded-md border overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Producto</TableHead>
              <TableHead className="text-right">Pendiente</TableHead>
              <TableHead className="text-right">Recibir</TableHead>
              <TableHead className="text-right">Costo unit.</TableHead>
              <TableHead>Lote</TableHead>
              <TableHead>Caducidad</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filas.map((f, idx) => (
              <TableRow key={f.ocLineaId}>
                <TableCell>
                  <div className="font-medium text-sm">{f.productoNombre}</div>
                  <div className="text-xs text-muted-foreground font-mono">
                    {f.productoSku} · {f.unidadMedida}
                  </div>
                  <input type="hidden" name="ocLineaId" value={f.ocLineaId} />
                </TableCell>
                <TableCell className="text-right tabular-nums text-sm">
                  {f.pendiente.toFixed(3)}
                </TableCell>
                <TableCell className="text-right">
                  <Input
                    name="recCantidad"
                    type="number"
                    step="0.001"
                    min={0}
                    max={f.pendiente}
                    value={f.cantidad === 0 ? "" : f.cantidad}
                    onChange={(e) =>
                      actualizar(idx, { cantidad: Number(e.target.value || 0) })
                    }
                    placeholder="0"
                    className="h-8 text-right tabular-nums w-24"
                  />
                </TableCell>
                <TableCell className="text-right">
                  <Input
                    name="recCostoUnitario"
                    type="number"
                    step="0.0001"
                    min={0}
                    value={f.costoUnitario}
                    onChange={(e) =>
                      actualizar(idx, { costoUnitario: Number(e.target.value) })
                    }
                    className="h-8 text-right tabular-nums w-28"
                  />
                </TableCell>
                <TableCell>
                  <Input
                    name="recLote"
                    value={f.lote}
                    onChange={(e) => actualizar(idx, { lote: e.target.value })}
                    placeholder="opcional"
                    className="h-8 text-xs font-mono w-32"
                  />
                </TableCell>
                <TableCell>
                  <Input
                    name="recCaducidad"
                    type="date"
                    value={f.caducidad}
                    onChange={(e) => actualizar(idx, { caducidad: e.target.value })}
                    className="h-8 text-xs"
                  />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <div>
        <Label htmlFor="recObs">Observaciones</Label>
        <Input id="recObs" name="observaciones" placeholder="opcional" />
      </div>

      <div className="flex items-center justify-between">
        <p className="text-xs text-muted-foreground">
          Total a recibir: <span className="font-medium text-foreground">{totalRecibido.toFixed(3)}</span>
        </p>
        <Submit label="Registrar recepción" />
      </div>
    </form>
  );
}
