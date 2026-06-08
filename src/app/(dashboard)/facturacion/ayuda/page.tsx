import Link from "next/link";
import {
  ArrowLeft,
  ShoppingCart,
  FileText,
  IdCard,
  Stamp,
  Download,
  Ban,
  FlaskConical,
} from "lucide-react";
import { getFacturacionConfig } from "@/lib/modules/facturacion";
import { requirePermission } from "@/lib/auth-helpers";
import { Button } from "@/components/ui/button";

export default async function AyudaFacturacionPage() {
  await requirePermission("facturacion:leer");
  const cfg = getFacturacionConfig();

  return (
    <div className="space-y-6 max-w-3xl">
      <Button variant="outline" size="sm" asChild>
        <Link href="/facturacion">
          <ArrowLeft className="size-4" /> Volver a Facturación
        </Link>
      </Button>

      <div>
        <h2 className="text-2xl font-semibold tracking-tight">Cómo hacer una factura</h2>
        <p className="text-sm text-muted-foreground">
          Guía rápida para emitir una factura (CFDI) cuando un cliente te la pida.
        </p>
      </div>

      {cfg.modo === "demo" && (
        <div className="flex items-start gap-2 rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          <FlaskConical className="size-4 shrink-0 mt-0.5" />
          <div>
            Ahora mismo estás en <strong>modo de pruebas</strong>: puedes practicar todos los pasos,
            pero las facturas que generes <strong>no son válidas ante el SAT</strong>. Cuando el
            sistema esté conectado a tu cuenta de facturación, harás exactamente lo mismo y las
            facturas ya serán reales.
          </div>
        </div>
      )}

      <ol className="space-y-4">
        <Paso
          n={1}
          icon={<ShoppingCart className="size-5" />}
          titulo="Haz la venta como siempre"
        >
          Cobra la venta normal en el Punto de Venta. La factura se hace <em>después</em>, a partir
          de una venta que ya cobraste. Si sabes que el cliente va a querer factura, regístralo como
          cliente con sus datos fiscales para que se llenen solos.
        </Paso>

        <Paso n={2} icon={<FileText className="size-5" />} titulo="Abre la venta y presiona “Facturar”">
          Ve a{" "}
          <Link href="/ventas/historial" className="text-primary underline">
            Ventas → Historial
          </Link>
          , busca la venta y entra a su detalle. Arriba a la derecha verás el botón{" "}
          <strong>Facturar</strong>. (Si la venta ya tiene factura, en su lugar verás “Ver
          factura”.)
        </Paso>

        <Paso n={3} icon={<IdCard className="size-5" />} titulo="Captura los datos del cliente">
          El cliente te dará su <strong>Constancia de Situación Fiscal</strong> (la entrega el SAT).
          De ahí copia:
          <ul className="list-disc ml-5 mt-2 space-y-0.5">
            <li><strong>RFC</strong></li>
            <li><strong>Nombre o razón social</strong> (tal cual, sin “S.A. de C.V.”)</li>
            <li><strong>Código postal</strong></li>
            <li><strong>Régimen fiscal</strong> (lo eliges de la lista)</li>
            <li><strong>Uso del CFDI</strong> (para qué usará la factura; si no sabes, “Gastos en general”)</li>
          </ul>
          Si el cliente ya estaba registrado con estos datos, aparecerán llenos: solo verifícalos.
        </Paso>

        <Paso n={4} icon={<Stamp className="size-5" />} titulo="Presiona “Timbrar factura”">
          El sistema toma los productos y el total de la venta automáticamente, lo manda al SAT y te
          regresa la factura ya sellada. Si algún dato está mal, te lo dirá en pantalla para que lo
          corrijas y lo intentes de nuevo.
        </Paso>

        <Paso n={5} icon={<Download className="size-5" />} titulo="Entrega el PDF y el XML">
          Al terminar verás la factura. Usa los botones para <strong>imprimir el PDF</strong> o{" "}
          <strong>descargar el PDF y el XML</strong>. Al cliente se le entregan los dos archivos
          (el PDF es el que se lee; el XML es el archivo oficial).
        </Paso>

        <Paso n={6} icon={<Ban className="size-5" />} titulo="¿Te equivocaste? Cancélala">
          Si una factura salió mal, entra a ella desde{" "}
          <Link href="/facturacion" className="text-primary underline">
            Facturación
          </Link>{" "}
          y usa <strong>Cancelar factura</strong> (elige el motivo). Luego puedes volver a facturar
          la venta. La cancelación la hace un supervisor o administrador.
        </Paso>
      </ol>

      <div className="rounded-lg border bg-card p-4 text-sm text-muted-foreground">
        <p className="font-medium text-foreground mb-1">Si algo no funciona</p>
        Lo más común es que falten los <strong>datos fiscales de tu negocio</strong>. Revísalos en{" "}
        <Link href="/configuracion" className="text-primary underline">
          Configuración
        </Link>{" "}
        (RFC, razón social, régimen y código postal). Si el problema sigue, anota el mensaje que
        aparece en pantalla y compártelo con tu soporte técnico.
      </div>
    </div>
  );
}

function Paso({
  n,
  icon,
  titulo,
  children,
}: {
  n: number;
  icon: React.ReactNode;
  titulo: string;
  children: React.ReactNode;
}) {
  return (
    <li className="flex gap-4 rounded-lg border bg-card p-4">
      <div className="flex flex-col items-center gap-1 shrink-0">
        <span className="flex size-9 items-center justify-center rounded-full bg-primary text-primary-foreground font-semibold">
          {n}
        </span>
        <span className="text-muted-foreground">{icon}</span>
      </div>
      <div className="text-sm">
        <h3 className="font-semibold text-base mb-1">{titulo}</h3>
        <div className="text-muted-foreground leading-relaxed">{children}</div>
      </div>
    </li>
  );
}
