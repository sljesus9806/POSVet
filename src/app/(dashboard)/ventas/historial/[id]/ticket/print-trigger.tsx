"use client";

import { useEffect } from "react";

export function PrintTrigger() {
  useEffect(() => {
    const t = setTimeout(() => window.print(), 300);
    return () => clearTimeout(t);
  }, []);
  return null;
}

export function PrintButton() {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="border px-3 py-1 rounded text-xs"
    >
      Imprimir
    </button>
  );
}
