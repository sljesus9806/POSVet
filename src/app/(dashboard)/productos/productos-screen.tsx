"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Plus, Tag, ScrollText, PackagePlus, PackageOpen, SlidersHorizontal, Pencil, Power, Trash2, MoreHorizontal } from "lucide-react";
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Modal } from "@/components/ui/modal";
import {
  abrirEmpaqueAction,
  agregarStockAction,
  ajustarStockAction,
  cambiarActivoProductoAction,
  eliminarProductoAction,
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
  productoGranelId: string | null;
  productoGranelNombre: string | null;
  contenidoGranel: number | null;
  granelUnidad: string | null;
};

type Ubicacion = { id: string; nombre: string };
type AlertaStock = { productoId: string; sku: string; nombre: string; ubicacionNombre: string; stock: number; stockMinimo: number };

type ModalState =
  | { tipo: "stock"; prod: ProductoRow }
  | { tipo: "ajuste"; prod: ProductoRow }
  | { tipo: "abrir"; prod: ProductoRow }
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
  puedeEliminar,
}: {
  productos: ProductoRow[];
  ubicaciones: Ubicacion[];
  alertasBajoStock: AlertaStock[];
  totalPorCaducar: number;
  q: string;
  tipo: string;
  puedeInventario: boolean;
  puedeEditar: boolean;
  puedeEliminar: boolean;
}) {
  const router = useRouter();
  const [modal, setModal] = useState<ModalState>(null);
  const [verAlertas, setVerAlertas] = useState(false);
  const [pending, startTransition] = useTransition();

  function eliminar(p: ProductoRow) {
    if (!confirm(`¿Eliminar "${p.nombre}"?\n\nSi nunca se ha vendido ni movido, se borra. Si ya tiene historial, se ocultará para no romper los reportes.`)) return;
    startTransition(async () => {
      const res = await eliminarProductoAction({ id: p.id });
      if (res.ok) {
        toast.success(
          res.eliminado
            ? "Producto eliminado"
            : "Tiene historial: se ocultó en vez de borrarse",
        );
        router.refresh();
      } else {
        toast.error(res.error ?? "Error");
      }
    });
  }

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
                    <div className="flex justify-end">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0" disabled={pending} title="Acciones">
                            <MoreHorizontal className="size-4" />
                            <span className="sr-only">Acciones de {p.nombre}</span>
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-52">
                          {puedeInventario && (
                            <>
                              <DropdownMenuItem onSelect={() => setModal({ tipo: "stock", prod: p })}>
                                <PackagePlus className="size-4" /> Agregar stock
                              </DropdownMenuItem>
                              <DropdownMenuItem onSelect={() => setModal({ tipo: "ajuste", prod: p })}>
                                <SlidersHorizontal className="size-4" /> Ajustar (merma, conteo…)
                              </DropdownMenuItem>
                              {p.productoGranelId && (
                                <DropdownMenuItem onSelect={() => setModal({ tipo: "abrir", prod: p })}>
                                  <PackageOpen className="size-4" /> Abrir para granel
                                </DropdownMenuItem>
                              )}
                            </>
                          )}
                          {puedeInventario && (puedeEditar || puedeEliminar) && <DropdownMenuSeparator />}
                          {puedeEditar && (
                            <DropdownMenuItem asChild>
                              <Link href={`/productos/${p.id}`}><Pencil className="size-4" /> Editar</Link>
                            </DropdownMenuItem>
                          )}
                          {puedeEditar && (
                            <DropdownMenuItem onSelect={() => cambiarActivo(p)}>
                              <Power className="size-4" /> {p.activo ? "Ocultar" : "Reactivar"}
                            </DropdownMenuItem>
                          )}
                          {puedeEliminar && (
                            <DropdownMenuItem onSelect={() => eliminar(p)} className="text-destructive focus:text-destructive">
                              <Trash2 className="size-4" /> Eliminar
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
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

      {/* Modal: abrir empaque (granel) */}
      <Modal open={modal?.tipo === "abrir"} onClose={() => setModal(null)} title={`Abrir empaque — ${modal?.prod.nombre ?? ""}`}>
        {modal?.tipo === "abrir" && (
          <AbrirForm
            prod={modal.prod}
            ubicaciones={ubicaciones}
            onDone={() => { setModal(null); router.refresh(); }}
          />
        )}
      </Modal>
    </div>
  );
}

function AbrirForm({ prod, ubicaciones, onDone }: { prod: ProductoRow; ubicaciones: Ubicacion[]; onDone: () => void }) {
  const [ubicacionId, setUbicacionId] = useState(ubicaciones[0]?.id ?? "");
  const [cantidad, setCantidad] = useState("1");
  // Cuánto granel trae cada costal. Se captura aquí (al abrir); si ya se había
  // definido antes, viene de regalo.
  const [contenido, setContenido] = useState(prod.contenidoGranel ? String(prod.contenidoGranel) : "");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const empaques = Number(cantidad) || 0;
  const porCostal = Number(contenido) || 0;
  const granelUnidad = prod.granelUnidad ?? "";
  const granelEquivale = empaques > 0 && porCostal > 0 ? empaques * porCostal : 0;

  function guardar() {
    setError(null);
    startTransition(async () => {
      const res = await abrirEmpaqueAction({ productoId: prod.id, ubicacionId, cantidadEmpaques: empaques, contenido: porCostal });
      if (res.ok) {
        toast.success(`Abriste ${empaques} ${prod.unidadMedida} → ${res.granelResultante} ${granelUnidad} de ${prod.productoGranelNombre ?? "granel"}`);
        onDone();
      } else {
        setError(res.error ?? "Error");
      }
    });
  }

  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">
        Al abrir, baja del costal y sube a <strong>{prod.productoGranelNombre ?? "granel"}</strong>;
        al vender el granel se va restando de lo abierto.
      </p>
      <Campo label="Ubicación">
        <Select value={ubicacionId} onChange={setUbicacionId} options={ubicaciones.map((u) => ({ value: u.id, label: u.nombre }))} />
      </Campo>
      <div className="grid grid-cols-2 gap-3">
        <Campo label={`¿Cuántos costales abres? (tienes ${prod.stockTotal})`}>
          <Input type="number" min="0.001" step="0.001" value={cantidad} onChange={(e) => setCantidad(e.target.value)} autoFocus />
        </Campo>
        <Campo label={`¿Cuántos ${granelUnidad} trae cada costal?`}>
          <Input type="number" min="0.001" step="0.001" value={contenido} onChange={(e) => setContenido(e.target.value)} placeholder="ej. 20000" />
        </Campo>
      </div>
      {granelEquivale > 0 && (
        <p className="text-sm">Equivale a <strong>{granelEquivale} {granelUnidad}</strong> de granel.</p>
      )}
      {error && <p className="text-sm text-destructive">{error}</p>}
      <div className="flex justify-end gap-2 pt-1">
        <Button variant="outline" onClick={onDone} type="button">Cancelar</Button>
        <Button onClick={guardar} disabled={pending || empaques <= 0 || porCostal <= 0} type="button">{pending ? "Abriendo…" : "Abrir"}</Button>
      </div>
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
