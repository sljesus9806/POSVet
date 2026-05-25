// Print CSS para reportes: oculta sidebar, header, botones y filtros.
// Cada página de reporte renderiza este componente para activar las reglas.
export function PrintStyles() {
  return (
    <style>{`
      @media print {
        aside, header { display: none !important; }
        main { padding: 0 !important; }
        .no-print { display: none !important; }
        body { background: white !important; }
        .print-card { border: none !important; box-shadow: none !important; }
      }
    `}</style>
  );
}
