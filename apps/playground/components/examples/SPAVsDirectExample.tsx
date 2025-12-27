"use client";

import { useState, useEffect } from "react";
import { useRouter } from "@lolyjs/core/hooks";
import { useClientMounted } from "@lolyjs/core/hooks";

export function SPAVsDirectExample() {
  const [loadMethod, setLoadMethod] = useState<"unknown" | "spa" | "direct">("unknown");
  const [hydratedAt, setHydratedAt] = useState<Date | null>(null);
  const router = useRouter();
  const isMounted = useClientMounted();

  useEffect(() => {
    if (!isMounted) return;

    // Detect how the page was loaded
    const isSPA = window.performance.getEntriesByType("navigation")[0]?.type === "navigate" &&
      document.referrer !== "" &&
      new URL(document.referrer).origin === window.location.origin;

    setLoadMethod(isSPA ? "spa" : "direct");
    setHydratedAt(new Date());
  }, [isMounted]);

  if (!isMounted) {
    return <div className="h-32 bg-muted rounded animate-pulse" />;
  }

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">Información de Carga</h3>

      <div className="grid grid-cols-2 gap-4">
        <div className="p-4 bg-background border rounded">
          <p className="text-sm text-muted-foreground mb-1">Método de carga:</p>
          <p className="text-xl font-bold">
            {loadMethod === "spa" ? "🔄 SPA" : loadMethod === "direct" ? "🌐 Directa" : "⏳ Detectando..."}
          </p>
        </div>
        <div className="p-4 bg-background border rounded">
          <p className="text-sm text-muted-foreground mb-1">Hidratado a las:</p>
          <p className="text-sm font-mono">
            {hydratedAt ? hydratedAt.toLocaleTimeString() : "⏳"}
          </p>
        </div>
      </div>

      <div className="p-4 bg-muted/50 rounded-lg">
        <p className="text-sm mb-2">
          <strong>Prueba:</strong>
        </p>
        <ol className="text-sm space-y-1 list-decimal list-inside text-muted-foreground">
          <li>Navega a otra página usando los botones (SPA)</li>
          <li>Vuelve aquí - debería mostrar "SPA"</li>
          <li>Recarga la página directamente (F5) - debería mostrar "Directa"</li>
          <li>Ambos casos deben funcionar correctamente</li>
        </ol>
      </div>

      <div className="pt-4 border-t space-y-2">
        <p className="text-sm font-semibold">Navegación de prueba:</p>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => router.push("/")}
            className="px-4 py-2 border rounded hover:bg-muted text-sm"
          >
            Ir a Home (SPA)
          </button>
          <button
            onClick={() => router.push("/examples/client-components")}
            className="px-4 py-2 border rounded hover:bg-muted text-sm"
          >
            Ir a Ejemplos (SPA)
          </button>
          <a
            href="/examples/client-components/window-api"
            className="px-4 py-2 border rounded hover:bg-muted text-sm inline-block"
          >
            Ir a Window API (Directa)
          </a>
        </div>
      </div>
    </div>
  );
}

