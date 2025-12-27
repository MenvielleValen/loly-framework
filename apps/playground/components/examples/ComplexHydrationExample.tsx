"use client";

import { useState } from "react";
import { ClientOnly } from "@lolyjs/core/components";
import { useClientMounted } from "@lolyjs/core/hooks";
import { WindowInfo } from "./WindowInfo";
import { LocalStorageCounter } from "./LocalStorageCounter";

export function ComplexHydrationExample() {
  const [toggle, setToggle] = useState(false);
  const isMounted = useClientMounted();

  return (
    <div className="space-y-6">
      <div className="p-4 bg-background border rounded">
        <h3 className="text-lg font-semibold mb-2">Componente Principal (use client)</h3>
        <p className="text-sm text-muted-foreground mb-4">
          Este componente está marcado con "use client" y contiene múltiples sub-componentes.
        </p>
        <button
          onClick={() => setToggle(!toggle)}
          className="px-4 py-2 border rounded hover:bg-muted"
        >
          {toggle ? "Ocultar" : "Mostrar"} Componentes Anidados
        </button>
      </div>

      {toggle && (
        <div className="space-y-4">
          <div className="p-4 bg-background border rounded">
            <h4 className="font-semibold mb-2">1. Componente con useClientMounted</h4>
            {isMounted ? (
              <p className="text-sm text-green-600">✅ Montado en cliente</p>
            ) : (
              <p className="text-sm text-yellow-600">⏳ Esperando montaje...</p>
            )}
          </div>

          <div className="p-4 bg-background border rounded">
            <h4 className="font-semibold mb-2">2. Componente con ClientOnly (Window API)</h4>
            <ClientOnly fallback={<div className="h-24 bg-muted rounded animate-pulse" />}>
              <WindowInfo />
            </ClientOnly>
          </div>

          <div className="p-4 bg-background border rounded">
            <h4 className="font-semibold mb-2">3. Componente con ClientOnly (LocalStorage)</h4>
            <ClientOnly fallback={<div className="h-24 bg-muted rounded animate-pulse" />}>
              <LocalStorageCounter />
            </ClientOnly>
          </div>
        </div>
      )}

      <div className="p-4 bg-muted/50 rounded-lg">
        <p className="text-xs text-muted-foreground">
          💡 Este ejemplo prueba que múltiples estrategias de hidratación funcionan correctamente
          juntas, incluso cuando están anidadas.
        </p>
      </div>
    </div>
  );
}

