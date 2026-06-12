"use client";

import { useActionState, useState, useTransition } from "react";
import { useFormStatus } from "react-dom";
import { toast } from "sonner";
import { Plus, Trash2, PackagePlus } from "lucide-react";
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
import { crearOrdenCompraAction, crearProductoRapidoAction, type FormState } from "../actions";
import type { CatalogoSugerencia } from "@/lib/modules/compras";

type ProveedorOpt = { id: string; codigo: string; nombre: string };
type UbicacionOpt = { id: string; nombre: string; tipo: string };

type LineaLocal = {
  key: string;
  productoId: string;
  productoSku: string;
  productoNombre: string;
  unidadMedida: string;
  codigoProveedor: string;
  cantidad: number;
  costoUnitario: number;
  ivaTasa: number;
};

const initial: FormState = { ok: false };

function fmtMoneda(n: number) {
  return new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN" }).format(n);
}

function Submit({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? "Creando…" : label}
    </Button>
  );
}

export function NuevaOcForm({
  proveedores,
  ubicaciones,
  proveedorIdInicial,
  productos: productosIniciales,
}: {
  proveedores: ProveedorOpt[];
  ubicaciones: UbicacionOpt[];
  proveedorIdInicial: string | null;
  productos: CatalogoSugerencia[];
}) {
  const [state, action] = useActionState(crearOrdenCompraAction, initial);
  const [proveedorId, setProveedorId] = useState(proveedorIdInicial ?? "");
  const [ubicacionDestinoId, setUbicacionDestinoId] = useState(
    ubicaciones.find((u) => u.tipo === "BODEGA")?.id ?? ubicaciones[0]?.id ?? "",
  );
  // Catálogo completo (todos los productos). Crece si se crea uno nuevo inline.
  const [productos, setProductos] = useState<CatalogoSugerencia[]>(productosIniciales);
  const [productoSel, setProductoSel] = useState<string>("");
  const [lineas, setLineas] = useState<LineaLocal[]>([]);
  const [incluyeIva, setIncluyeIva] = useState(true);

  // Crear producto nuevo inline
  const [creando, setCreando] = useState(false);
  const [nuevoNombre, setNuevoNombre] = useState("");
  const [nuevoPrecio, setNuevoPrecio] = useState("");
  const [pendingCrear, startCrear] = useTransition();

  function agregarDesdeSugerencia(sug: CatalogoSugerencia) {
    if (lineas.some((l) => l.productoId === sug.productoId)) return;
    setLineas((prev) => [
      ...prev,
      {
        key: `${sug.productoId}-${Date.now()}`,
        productoId: sug.productoId,
        productoSku: sug.sku,
        productoNombre: sug.nombre,
        unidadMedida: sug.unidadMedida,
        codigoProveedor: sug.codigoProveedor ?? "",
        cantidad: 1,
        costoUnitario: sug.costoUnitario,
        ivaTasa: sug.ivaAplicable,
      },
    ]);
  }

  function agregarLinea() {
    if (!productoSel) return;
    const sug = productos.find((s) => s.productoId === productoSel);
    if (!sug) return;
    agregarDesdeSugerencia(sug);
    setProductoSel("");
  }

  function crearProductoNuevo() {
    if (!nuevoNombre.trim()) return;
    startCrear(async () => {
      const res = await crearProductoRapidoAction({
        nombre: nuevoNombre.trim(),
        precioVenta: Number(nuevoPrecio) || undefined,
      });
      if (res.ok && res.producto) {
        const sug: CatalogoSugerencia = res.producto;
        setProductos((prev) => [...prev, sug]);
        agregarDesdeSugerencia(sug);
        toast.success(`Producto "${sug.nombre}" creado y agregado`);
        setNuevoNombre("");
        setNuevoPrecio("");
        setCreando(false);
      } else {
        toast.error(res.error ?? "No se pudo crear el producto");
      }
    });
  }

  function actualizar(key: string, patch: Partial<LineaLocal>) {
    setLineas(lineas.map((l) => (l.key === key ? { ...l, ...patch } : l)));
  }

  function quitar(key: string) {
    setLineas(lineas.filter((l) => l.key !== key));
  }

  const sugerenciasNoUsadas = productos.filter(
    (s) => !lineas.some((l) => l.productoId === s.productoId),
  );

  // Totales: si los precios incluyen IVA, la base sale de dividir entre (1+tasa).
  let subtotal = 0;
  let iva = 0;
  for (const l of lineas) {
    const total = l.cantidad * l.costoUnitario; // costo capturado
    if (incluyeIva) {
      const base = l.costoUnitario / (1 + l.ivaTasa);
      subtotal += l.cantidad * base;
      iva += total - l.cantidad * base;
    } else {
      subtotal += total;
      iva += total * l.ivaTasa;
    }
  }
  const total = incluyeIva ? subtotal + iva : subtotal + iva;

  return (
    <form action={action} className="space-y-6">
      {state.error && (
        <div className="rounded-md border border-destructive/50 bg-destructive/10 text-destructive text-sm px-3 py-2">
          {state.error}
        </div>
      )}

      <section className="rounded-lg border bg-card p-5 space-y-4">
        <h3 className="font-semibold">Datos generales</h3>
        <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
          <div className="sm:col-span-5">
            <Label htmlFor="proveedorId">Proveedor (opcional)</Label>
            <select
              id="proveedorId"
              name="proveedorId"
              value={proveedorId}
              onChange={(e) => setProveedorId(e.target.value)}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            >
              <option value="">— Sin proveedor —</option>
              {proveedores.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.codigo} · {p.nombre}
                </option>
              ))}
            </select>
          </div>
          <div className="sm:col-span-4">
            <Label htmlFor="ubicacionDestinoId">Ubicación destino</Label>
            <select
              id="ubicacionDestinoId"
              name="ubicacionDestinoId"
              required
              value={ubicacionDestinoId}
              onChange={(e) => setUbicacionDestinoId(e.target.value)}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            >
              {ubicaciones.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.nombre} ({u.tipo})
                </option>
              ))}
            </select>
          </div>
          <div className="sm:col-span-3">
            <Label htmlFor="fechaEsperada">Fecha esperada</Label>
            <Input id="fechaEsperada" name="fechaEsperada" type="date" />
          </div>
          <div className="sm:col-span-12">
            <Label htmlFor="observaciones">Observaciones</Label>
            <Input id="observaciones" name="observaciones" placeholder="opcional" />
          </div>
        </div>
      </section>

      <section className="rounded-lg border bg-card p-5 space-y-4">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div>
            <h3 className="font-semibold">Productos</h3>
            <p className="text-xs text-muted-foreground">
              Agrega cualquier producto o crea uno nuevo. Captura el costo al que te lo vendieron.
            </p>
          </div>
          {/* Toggle IVA incluido. Checkbox marcado por defecto → precios con IVA. */}
          <label className="flex items-center gap-2 text-sm rounded-md border px-3 py-2">
            <input
              type="checkbox"
              name="preciosIncluyenIva"
              checked={incluyeIva}
              onChange={(e) => setIncluyeIva(e.target.checked)}
              className="size-4"
            />
            El precio capturado ya incluye IVA
          </label>
        </div>

        <div className="flex items-end gap-2 flex-wrap">
          <div className="flex-1 min-w-[240px]">
            <Label htmlFor="agregarProducto">Agregar producto</Label>
            <select
              id="agregarProducto"
              value={productoSel}
              onChange={(e) => setProductoSel(e.target.value)}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            >
              <option value="">
                {sugerenciasNoUsadas.length === 0
                  ? "No hay más productos en el catálogo"
                  : "Selecciona del catálogo…"}
              </option>
              {sugerenciasNoUsadas.map((s) => (
                <option key={s.productoId} value={s.productoId}>
                  {s.sku} · {s.nombre} — {fmtMoneda(s.costoUnitario)} / {s.unidadMedida}
                </option>
              ))}
            </select>
          </div>
          <Button type="button" onClick={agregarLinea} disabled={!productoSel}>
            <Plus className="size-4" /> Agregar
          </Button>
          <Button type="button" variant="outline" onClick={() => setCreando((v) => !v)}>
            <PackagePlus className="size-4" /> Crear producto nuevo
          </Button>
        </div>

        {creando && (
          <div className="rounded-md border bg-muted/40 p-3 flex items-end gap-2 flex-wrap">
            <div className="flex-1 min-w-[200px]">
              <Label htmlFor="nuevoNombre">Nombre del producto</Label>
              <Input
                id="nuevoNombre"
                value={nuevoNombre}
                onChange={(e) => setNuevoNombre(e.target.value)}
                placeholder="ej. Shampoo antipulgas"
                autoFocus
              />
            </div>
            <div className="w-36">
              <Label htmlFor="nuevoPrecio">Precio venta (opcional)</Label>
              <Input
                id="nuevoPrecio"
                type="number"
                step="0.01"
                min="0"
                value={nuevoPrecio}
                onChange={(e) => setNuevoPrecio(e.target.value)}
                placeholder="0.00"
              />
            </div>
            <Button type="button" onClick={crearProductoNuevo} disabled={pendingCrear || !nuevoNombre.trim()}>
              {pendingCrear ? "Creando…" : "Crear y agregar"}
            </Button>
          </div>
        )}

        {lineas.length > 0 && (
          <div className="rounded-md border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Producto</TableHead>
                  <TableHead>Cód. proveedor</TableHead>
                  <TableHead className="text-right">Cantidad</TableHead>
                  <TableHead className="text-right">Costo unit.</TableHead>
                  <TableHead className="text-right">% IVA</TableHead>
                  <TableHead className="text-right">Importe</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {lineas.map((l) => {
                  const tot = l.cantidad * l.costoUnitario * (incluyeIva ? 1 : 1 + l.ivaTasa);
                  return (
                    <TableRow key={l.key}>
                      <TableCell>
                        <div className="font-medium text-sm">{l.productoNombre}</div>
                        <div className="text-xs text-muted-foreground font-mono">
                          {l.productoSku} · {l.unidadMedida}
                        </div>
                        <input type="hidden" name="productoId" value={l.productoId} />
                      </TableCell>
                      <TableCell>
                        <Input
                          name="codigoProveedor"
                          value={l.codigoProveedor}
                          onChange={(e) => actualizar(l.key, { codigoProveedor: e.target.value })}
                          className="h-8 text-xs font-mono"
                          placeholder="—"
                        />
                      </TableCell>
                      <TableCell className="text-right">
                        <Input
                          name="cantidad"
                          type="number"
                          step="0.001"
                          min="0.001"
                          value={l.cantidad}
                          onChange={(e) => actualizar(l.key, { cantidad: Number(e.target.value) })}
                          className="h-8 text-right tabular-nums w-24"
                          required
                        />
                      </TableCell>
                      <TableCell className="text-right">
                        <Input
                          name="costoUnitario"
                          type="number"
                          step="0.0001"
                          min={0}
                          value={l.costoUnitario}
                          onChange={(e) => actualizar(l.key, { costoUnitario: Number(e.target.value) })}
                          className="h-8 text-right tabular-nums w-28"
                          required
                        />
                      </TableCell>
                      <TableCell className="text-right">
                        <Input
                          name="ivaTasa"
                          type="number"
                          step="0.01"
                          min={0}
                          max={1}
                          value={l.ivaTasa}
                          onChange={(e) => actualizar(l.key, { ivaTasa: Number(e.target.value) })}
                          className="h-8 text-right tabular-nums w-20"
                        />
                      </TableCell>
                      <TableCell className="text-right tabular-nums text-sm">
                        {fmtMoneda(tot)}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          onClick={() => quitar(l.key)}
                          title="Quitar línea"
                        >
                          <Trash2 className="size-4 text-destructive" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}

        {lineas.length > 0 && (
          <div className="flex justify-end">
            <div className="text-sm tabular-nums space-y-1 min-w-[220px]">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Subtotal</span>
                <span>{fmtMoneda(subtotal)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">IVA</span>
                <span>{fmtMoneda(iva)}</span>
              </div>
              <div className="flex justify-between font-semibold border-t pt-1">
                <span>Total</span>
                <span>{fmtMoneda(total)}</span>
              </div>
            </div>
          </div>
        )}
      </section>

      <div className="flex justify-end gap-2">
        <Button variant="outline" type="reset">
          Limpiar
        </Button>
        <Submit label="Crear OC en borrador" />
      </div>
    </form>
  );
}
