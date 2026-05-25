import { notFound } from "next/navigation";
import { prisma } from "@/lib/modules/shared/db";
import { ventasService } from "@/lib/modules/ventas";
import { requirePermission } from "@/lib/auth-helpers";
import { PrintTrigger, PrintButton } from "./print-trigger";

const fmt = (n: number) =>
  new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN" }).format(n);

type Params = Promise<{ id: string }>;

export default async function TicketPage({ params }: { params: Params }) {
  await requirePermission("ventas:leer");
  const { id } = await params;
  const v = await ventasService.obtenerVenta(id);
  if (!v) notFound();
  const empresa = await prisma.empresa.findFirst({
    where: { activa: true },
    select: { razonSocial: true, rfc: true, direccion: true, telefono: true },
  });

  return (
    <>
      <PrintTrigger />
      <style>{`
        @page { size: 80mm auto; margin: 4mm; }
        body { background: white; }
      `}</style>
      <div className="ticket mx-auto max-w-[80mm] bg-white text-black font-mono text-[11px] leading-snug p-2">
        <header className="text-center space-y-0.5">
          <div className="font-bold text-sm">{empresa?.razonSocial ?? "POSVet"}</div>
          {empresa?.rfc && <div>RFC: {empresa.rfc}</div>}
          {empresa?.direccion && <div>{empresa.direccion}</div>}
          {empresa?.telefono && <div>Tel: {empresa.telefono}</div>}
        </header>

        <hr className="border-dashed border-black my-1" />

        <section className="text-[10px]">
          <div className="flex justify-between">
            <span>Ticket:</span>
            <span className="font-bold">{v.folio}</span>
          </div>
          <div className="flex justify-between">
            <span>Fecha:</span>
            <span>{v.fechaVenta.toLocaleString("es-MX")}</span>
          </div>
          <div className="flex justify-between">
            <span>Caja:</span>
            <span>{v.cajaFolio}</span>
          </div>
          <div className="flex justify-between">
            <span>Cajero:</span>
            <span>{v.usuarioNombre}</span>
          </div>
          {v.clienteId && (
            <div className="flex justify-between">
              <span>Cliente:</span>
              <span className="text-right">{v.clienteCodigo}</span>
            </div>
          )}
        </section>

        <hr className="border-dashed border-black my-1" />

        <table className="w-full text-[10px]">
          <thead>
            <tr>
              <th className="text-left">Producto</th>
              <th className="text-right w-[60px]">Importe</th>
            </tr>
          </thead>
          <tbody>
            {v.lineas.map((l) => (
              <tr key={l.id} className="align-top">
                <td className="pr-1">
                  <div>{l.productoNombre}</div>
                  <div className="text-[9px]">
                    {l.cantidad} {l.unidadMedida} × {fmt(l.precioUnitario)}
                    {l.descuento > 0 && ` − ${fmt(l.descuento)}`}
                  </div>
                </td>
                <td className="text-right tabular-nums">{fmt(l.total)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <hr className="border-dashed border-black my-1" />

        <section className="space-y-0.5">
          <Row label="Subtotal" value={fmt(v.subtotal)} />
          <Row label="IVA" value={fmt(v.iva)} />
          {v.descuentoLineas > 0 && <Row label="Desc. líneas" value={`− ${fmt(v.descuentoLineas)}`} />}
          {v.descuentoGlobal > 0 && <Row label="Desc. global" value={`− ${fmt(v.descuentoGlobal)}`} />}
          <Row label="TOTAL" value={fmt(v.total)} bold />
        </section>

        <hr className="border-dashed border-black my-1" />

        <section className="space-y-0.5">
          {v.pagos.map((p) => (
            <Row key={p.id} label={p.forma} value={fmt(p.monto)} />
          ))}
          <Row label="Recibido" value={fmt(v.totalPagado)} />
          <Row label="Cambio" value={fmt(v.cambio)} bold />
        </section>

        <hr className="border-dashed border-black my-1" />

        <footer className="text-center text-[10px] space-y-1">
          <div>¡Gracias por su compra!</div>
          {v.estado === "CANCELADA" && (
            <div className="font-bold text-[12px]">*** VENTA CANCELADA ***</div>
          )}
        </footer>

        <div className="no-print mt-4 text-center">
          <PrintButton />
        </div>
      </div>
      <style>{`
        @media print { .no-print { display: none !important; } }
      `}</style>
    </>
  );
}

function Row({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <div className={`flex justify-between ${bold ? "font-bold" : ""}`}>
      <span>{label}</span>
      <span className="tabular-nums">{value}</span>
    </div>
  );
}
