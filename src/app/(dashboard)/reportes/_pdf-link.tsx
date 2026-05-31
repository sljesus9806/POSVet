import { Download, Sheet } from "lucide-react";
import { Button } from "@/components/ui/button";

export function PdfLink({ href }: { href: string }) {
  return (
    <Button asChild variant="outline" size="sm" className="no-print">
      <a href={href} target="_blank" rel="noopener" download>
        <Download className="size-4" /> Descargar PDF
      </a>
    </Button>
  );
}

export function CsvLink({ href }: { href: string }) {
  return (
    <Button asChild variant="outline" size="sm" className="no-print">
      <a href={href} target="_blank" rel="noopener" download>
        <Sheet className="size-4" /> Descargar CSV
      </a>
    </Button>
  );
}
