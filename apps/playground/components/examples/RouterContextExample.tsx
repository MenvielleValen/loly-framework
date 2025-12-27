"use client";

import { useRouter } from "@lolyjs/core/hooks";
import { useClientMounted } from "@lolyjs/core/hooks";

export function RouterContextExample() {
  const router = useRouter();
  const isMounted = useClientMounted();

  if (!isMounted) {
    return <div className="h-32 bg-muted rounded animate-pulse" />;
  }

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">Información del Router</h3>
      
      <div className="space-y-2">
        <div className="p-3 bg-background border rounded">
          <p className="text-sm text-muted-foreground">Pathname actual:</p>
          <p className="font-mono text-sm">{router.pathname}</p>
        </div>
        
        <div className="p-3 bg-background border rounded">
          <p className="text-sm text-muted-foreground">Query params:</p>
          <p className="font-mono text-sm">{JSON.stringify(router.query, null, 2)}</p>
        </div>
        
        <div className="p-3 bg-background border rounded">
          <p className="text-sm text-muted-foreground">Route params:</p>
          <p className="font-mono text-sm">{JSON.stringify(router.params, null, 2)}</p>
        </div>
      </div>

      <div className="pt-4 border-t space-y-2">
        <p className="text-sm font-semibold">Navegación:</p>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => router.push("/")}
            className="px-4 py-2 border rounded hover:bg-muted text-sm"
          >
            Ir a Home
          </button>
          <button
            onClick={() => router.push("/examples/client-components")}
            className="px-4 py-2 border rounded hover:bg-muted text-sm"
          >
            Ir a Ejemplos
          </button>
          <button
            onClick={() => router.push("/examples/client-components/window-api")}
            className="px-4 py-2 border rounded hover:bg-muted text-sm"
          >
            Ir a Window API
          </button>
          <button
            onClick={() => router.refresh()}
            className="px-4 py-2 border rounded hover:bg-muted text-sm"
          >
            Refresh
          </button>
        </div>
      </div>
    </div>
  );
}

