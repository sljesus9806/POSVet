"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Plus, Tag, ArrowLeftRight, ScrollText, PackagePlus, SlidersHorizontal, Pencil, Power } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Modal } from "@/components/ui/modal";
import {
  agregarStockAction,
  ajustarStockAction,
  cambiarActivoProductoAction,
} from "./inventario-actions";

const TIPOS = ["TODOS", "MEDICAMENTO", "ALIMENTO", "ACCESORIO", "SERVICIO"] as const;

const fmtMoneda = (n: number | null) =>
  n === null ? "—" : new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN" }).format(n);

export type ProductoRow = {
  id: string;
  sku: string;
  nombre: string;
  tipo: string;
  categoriaNombre: string | null;
  marca: string | null;
  especie: string | null;
  precioPublico: number | null;
  stockTotal: number;
  unidadMedida: string;
  activo: boolean;
};

type Ubicacion = { id: string; nombre: string };
type AlertaStock = { productoId: string; sku: string; nombre: string; ubicacionNombre: string; stock: number; stockMinimo: number };

type ModalState =
  | { tipo: "stock"; prod: ProductoRow }
  | { tipo: "ajuste"; prod: ProductoRow }
  | null;

export function ProductosScreen({
  productos,
  ubicaciones,
  alertasBajoStock,
  totalPorCaducar,
  q,
  tipo,
  puedeInventario,
  puedeEditar,
}: {
  productos: ProductoRow[];
  ubicaciones: Ubicacion[];
  alertasBajoStock: AlertaStock[];
  totalPorCaducar: number;
  q: string;
  tipo: string;
  puedeInventario: boolean;
  puedeEditar: boolean;
}) {
  const router = useRouter();
  const [modal, setModal] = useState<ModalState>(null);
  const [verAlertas, setVerAlertas] = useState(false);
  const [pending, startTransition] = useTransition();

  function cambiarActivo(p: ProductoRow) {
    const accion = p.activo ? "ocultar" : "reactivar";
    if (!confirm(`¿Seguro que quieres ${accion} "${p.nombre}"? No se borra; ${p.activo ? "deja de aparecer en ventas" : "vuelve a estar disponible"}.`)) return;
    startTransition(async () => {
      const res = await cambiarActivoProductoAction({ id: p.id, activo: !p.activo });
      if (res.ok) {
        toast.success(p.activo ? "Producto ocultado" : "Producto reactivado");
        router.refresh();
      } else {
        toast.error(res.error ?? "Error");
      }
    });
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">Productos e inventario</h2>
          <p className="text-sm text-muted-foreground">
            Catálogo y existencias en un solo lugar. Agrega stock, ajusta o edita desde aquí.
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button variant="outline" size="sm" asChild>
            <Link href="/productos/categorias"><Tag className="size-4" /> Categorías</Link>
          </Button>
          <Button variant="outline" size="sm" asChild>
            <Link href="/inventario/transferencias"><ArrowLeftRight className="size-4" /> Transferencias</Link>
          </Button>
          <Button variant="outline" size="sm" asChild>
            <Link href="/inventario/movimientos"><ScrollText className="size-4" /> Movimientos</Link>
          </Button>
          <Button size="sm" asChild>
            <Link href="/productos/nuevo"><Plus className="size-4" /> Nuevo producto</Link>
          </Button>
        </div>
      </div>

      {/* Alertas de inventario */}
      {(alertasBajoStock.length > 0 || totalPorCaducar > 0) && (
        <div className="bg-card rounded-lg border">
          <button
            type="button"
            onClick={() => setVerAlertas((v) => !v)}
            className="w-full px-4 py-3 flex items-center justify-between text-sm hover:bg-accent/40"
          >
            <span className="font-medium flex items-center gap-2 flex-wrap">
              {alertasBajoStock.length > 0 && (
                <Badge variant="destructive">{alertasBajoStock.length} bajo stock</Badge>
              )}
              {totalPorCaducar > 0 && (
                <Badge variant="outline">{totalPorCaducar} por caducar</Badge>
              )}
            </span>
            <span className="text-xs text-muted-foreground">{verAlertas ? "Ocultar" : "Ver"}</span>
          </button>
          {verAlertas && alertasBajoStock.length > 0 && (
            <ul className="border-t divide-y max-h-56 overflow-y-auto text-sm">
              {alertasBajoStock.map((a) => (
                <li key={`${a.productoId}-${a.ubicacionNombre}`} className="px-4 py-2 flex justify-between">
                  <span className="truncate">{a.nombre} <span className="text-muted-foreground">· {a.ubicacionNombre}</span></span>
                  <span className="tabular-nums shrink-0">
                    {a.stock} <span className="text-muted-foreground">/ mín {a.stockMinimo}</span>
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {/* Búsqueda */}
      <form className="flex flex-wrap items-end gap-3 bg-card p-4 rounded-lg border">
        <div className="flex-1 min-w-[220px]">
          <label className="text-xs font-medium text-muted-foreground">Buscar</label>
          <Input name="q" defaultValue={q} placeholder="SKU, nombre, marca, código de barras…" />
        </div>
        <div>
          <label className="text-xs font-medium text-muted-foreground">Tipo</label>
          <select
            name="tipo"
            defaultValue={tipo}
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          >
            {TIPOS.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
        <Button type="submit" variant="secondary">Filtrar</Button>
      </form>

      {/* Tabla */}
      <div className="rounded-lg border bg-card overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>SKU</TableHead>
              <TableHead>Nombre</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead className="text-right">Precio público</TableHead>
              <TableHead className="text-right">Stock</TableHead>
              <TableHead className="text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {productos.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-muted-foreground py-10">
                  Sin productos. Crea uno con “Nuevo producto”.
                </TableCell>
              </TableRow>
            ) : (
              productos.map((p) => (
                <TableRow key={p.id} className={p.activo ? "" : "opacity-60"}>
                  <TableCell className="font-mono text-xs">{p.sku}</TableCell>
                  <TableCell className="font-medium">
                    {p.nombre}
                    {!p.activo && <Badge variant="outline" className="ml-2">oculto</Badge>}
                    <div className="text-xs text-muted-foreground font-normal">
                      {[p.categoriaNombre, p.marca, p.especie].filter(Boolean).join(" · ") || "—"}
                    </div>
                  </TableCell>
                  <TableCell><Badge variant="secondary">{p.tipo}</Badge></TableCell>
                  <TableCell className="text-right tabular-nums">{fmtMoneda(p.precioPublico)}</TableCell>
                  <TableCell className="text-right tabular-nums">{p.stockTotal} {p.unidadMedida}</TableCell>
                  <TableCell>
                    <div className="flex items-center justify-end gap-1 flex-wrap">
                      {puedeInventario && (
                        <>
                          <Button variant="outline" size="sm" className="h-8" onClick={() => setModal({ tipo: "stock", prod: p })}>
                            <PackagePlus className="size-4" /> Stock
                          </Button>
                          <Button variant="ghost" size="sm" className="h-8" onClick={() => setModal({ tipo: "ajuste", prod: p })} title="Ajustar (merma, conteo…)">
                            <SlidersHorizontal className="size-4" />
                          </Button>
                        </>
                      )}
                      {puedeEditar && (
                        <Button variant="ghost" size="sm" className="h-8" asChild title="Editar">
                          <Link href={`/productos/${p.id}`}><Pencil className="size-4" /></Link>
                        </Button>
                      )}
                      {puedeEditar && (
                        <Button variant="ghost" size="sm" className="h-8" onClick={() => cambiarActivo(p)} disabled={pending} title={p.activo ? "Ocultar" : "Reactivar"}>
                          <Power className={`size-4 ${p.activo ? "" : "text-muted-foreground"}`} />
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Modal: agregar stock */}
      <Modal open={modal?.tipo === "stock"} onClose={() => setModal(null)} title={`Agregar stock — ${modal?.prod.nombre ?? ""}`}>
        {modal?.tipo === "stock" && (
          <StockForm
            prod={modal.prod}
            ubicaciones={ubicaciones}
            onDone={() => { setModal(null); router.refresh(); }}
          />
        )}
      </Modal>

      {/* Modal: ajustar stock */}
      <Modal open={modal?.tipo === "ajuste"} onClose={() => setModal(null)} title={`Ajustar stock — ${modal?.prod.nombre ?? ""}`}>
        {modal?.tipo === "ajuste" && (
          <AjusteForm
            prod={modal.prod}
            ubicaciones={ubicaciones}
            onDone={() => { setModal(null); router.refresh(); }}
          />
        )}
      </Modal>
    </div>
  );
}

function StockForm({ prod, ubicaciones, onDone }: { prod: ProductoRow; ubicaciones: Ubicacion[]; onDone: () => void }) {
  const [ubicacionId, setUbicacionId] = useState(ubicaciones[0]?.id ?? "");
  const [cantidad, setCantidad] = useState("");
  const [costo, setCosto] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function guardar() {
    setError(null);
    startTransition(async () => {
      const res = await agregarStockAction({
        productoId: prod.id,
        ubicacionId,
        cantidad: Number(cantidad) || 0,
        costoUnitario: Number(costo) || 0,
      });
      if (res.ok) {
        toast.success(`Stock agregado a ${prod.nombre}`);
        onDone();
      } else {
        setError(res.error ?? "Error");
      }
    });
  }

  return (
    <div className="space-y-3">
      <Campo label="Ubicación">
        <Select value={ubicacionId} onChange={setUbicacionId} options={ubicaciones.map((u) => ({ value: u.id, label: u.nombre }))} />
      </Campo>
      <div className="grid grid-cols-2 gap-3">
        <Campo label={`Cantidad (${prod.unidadMedida})`}>
          <Input type="number" min="0" step="0.001" value={cantidad} onChange={(e) => setCantidad(e.target.value)} autoFocus />
        </Campo>
        <Campo label="Costo unitario">
          <Input type="number" min="0" step="0.01" value={costo} onChange={(e) => setCosto(e.target.value)} />
        </Campo>
      </div>
      {error && <p className="text-sm text-destructive">{error}</p>}
      <div className="flex justify-end gap-2 pt-1">
        <Button variant="outline" onClick={onDone} type="button">Cancelar</Button>
        <Button onClick={guardar} disabled={pending} type="button">{pending ? "Guardando…" : "Agregar stock"}</Button>
      </div>
    </div>
  );
}

function AjusteForm({ prod, ubicaciones, onDone }: { prod: ProductoRow; ubicaciones: Ubicacion[]; onDone: () => void }) {
  const [ubicacionId, setUbicacionId] = useState(ubicaciones[0]?.id ?? "");
  const [direccion, setDireccion] = useState<"quitar" | "agregar">("quitar");
  const [cantidad, setCantidad] = useState("");
  const [motivo, setMotivo] = useState("AJUSTE_MERMA");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function guardar() {
    setError(null);
    const cant = Number(cantidad) || 0;
    const delta = direccion === "quitar" ? -cant : cant;
    startTransition(async () => {
      const res = await ajustarStockAction({ productoId: prod.id, ubicacionId, delta, motivo: motivo as never });
      if (res.ok) {
        toast.success(`Stock ajustado en ${prod.nombre}`);
        onDone();
      } else {
        setError(res.error ?? "Error");
      }
    });
  }

  return (
    <div className="space-y-3">
      <Campo label="Ubicación">
        <Select value={ubicacionId} onChange={setUbicacionId} options={ubicaciones.map((u) => ({ value: u.id, label: u.nombre }))} />
      </Campo>
      <div className="grid grid-cols-2 gap-3">
        <Campo label="Acción">
          <Select value={direccion} onChange={(v) => setDireccion(v as "quitar" | "agregar")} options={[{ value: "quitar", label: "Quitar (−)" }, { value: "agregar", label: "Agregar (+)" }]} />
        </Campo>
        <Campo label={`Cantidad (${prod.unidadMedida})`}>
          <Input type="number" min="0" step="0.001" value={cantidad} onChange={(e) => setCantidad(e.target.value)} autoFocus />
        </Campo>
      </div>
      <Campo label="Motivo">
        <Select
          value={motivo}
          onChange={setMotivo}
          options={[
            { value: "AJUSTE_MERMA", label: "Merma / daño" },
            { value: "AJUSTE_CADUCIDAD", label: "Caducidad" },
            { value: "AJUSTE_ROBO", label: "Robo / faltante" },
            { value: "AJUSTE_CONTEO", label: "Conteo físico" },
          ]}
        />
      </Campo>
      {error && <p className="text-sm text-destructive">{error}</p>}
      <div className="flex justify-end gap-2 pt-1">
        <Button variant="outline" onClick={onDone} type="button">Cancelar</Button>
        <Button onClick={guardar} disabled={pending} type="button">{pending ? "Guardando…" : "Ajustar"}</Button>
      </div>
    </div>
  );
}

function Campo({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block space-y-1">
      <span className="text-xs font-medium text-muted-foreground">{label}</span>
      {children}
    </label>
  );
}

function Select({ value, onChange, options }: { value: string; onChange: (v: string) => void; options: { value: string; label: string }[] }) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
    >
      {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
    </select>
  );
}
