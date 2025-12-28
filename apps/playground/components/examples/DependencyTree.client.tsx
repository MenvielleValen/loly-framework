import { useState, useEffect } from "react";

interface DependencyInfo {
  route: string;
  directComponents: string[];
  layoutComponents: string[];
  allComponents: string[];
  chunks: string[];
}

export function DependencyTree() {
  const [dependencies, setDependencies] = useState<DependencyInfo | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // In production this would be loaded from the manifest
    // For now, we simulate the data
    const currentPath = window.location.pathname;
    
    // Simulate manifest loading
    setTimeout(() => {
      setDependencies({
        route: currentPath,
        directComponents: [
          "components/examples/WindowInfo.client.tsx",
        ],
        layoutComponents: [
          "components/shared/theme-switch.client.tsx",
        ],
        allComponents: [
          "components/examples/WindowInfo.client.tsx",
          "components/shared/theme-switch.client.tsx",
        ],
        chunks: [
          "client-component-components-examples-windowinfo",
          "client-component-components-shared-theme-switch",
        ],
      });
      setLoading(false);
    }, 500);
  }, []);

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-4 bg-muted rounded animate-pulse" />
        <div className="h-4 bg-muted rounded animate-pulse w-3/4" />
        <div className="h-4 bg-muted rounded animate-pulse w-1/2" />
      </div>
    );
  }

  if (!dependencies) {
    return (
      <div className="text-sm text-muted-foreground">
        No se encontraron dependencias para esta ruta.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Route */}
      <div>
        <h3 className="text-sm font-semibold mb-2">Ruta</h3>
        <code className="text-xs bg-background px-2 py-1 rounded block w-fit">
          {dependencies.route}
        </code>
      </div>

      {/* Direct components */}
      <div>
        <h3 className="text-sm font-semibold mb-2">
          Componentes Directos ({dependencies.directComponents.length})
        </h3>
        <ul className="space-y-1">
          {dependencies.directComponents.map((comp, idx) => (
            <li key={idx} className="text-xs text-muted-foreground">
              <code className="bg-background px-2 py-1 rounded">{comp}</code>
            </li>
          ))}
        </ul>
      </div>

      {/* Layout components */}
      {dependencies.layoutComponents.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold mb-2">
            Componentes de Layout ({dependencies.layoutComponents.length})
          </h3>
          <ul className="space-y-1">
            {dependencies.layoutComponents.map((comp, idx) => (
              <li key={idx} className="text-xs text-muted-foreground">
                <code className="bg-background px-2 py-1 rounded">{comp}</code>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* All components */}
      <div>
        <h3 className="text-sm font-semibold mb-2">
          Todos los Componentes ({dependencies.allComponents.length})
        </h3>
        <ul className="space-y-1">
          {dependencies.allComponents.map((comp, idx) => (
            <li key={idx} className="text-xs text-muted-foreground">
              <code className="bg-background px-2 py-1 rounded">{comp}</code>
            </li>
          ))}
        </ul>
      </div>

      {/* Chunks to preload */}
      <div>
        <h3 className="text-sm font-semibold mb-2">
          Chunks a Preload ({dependencies.chunks.length})
        </h3>
        <ul className="space-y-1">
          {dependencies.chunks.map((chunk, idx) => (
            <li key={idx} className="text-xs text-muted-foreground">
              <code className="bg-background px-2 py-1 rounded">{chunk}.js</code>
            </li>
          ))}
        </ul>
      </div>

      {/* Info adicional */}
      <div className="pt-4 border-t">
        <p className="text-xs text-muted-foreground">
          Estos chunks se preload automáticamente en el <code className="bg-background px-1 rounded">&lt;head&gt;</code> del HTML.
        </p>
      </div>
    </div>
  );
}

