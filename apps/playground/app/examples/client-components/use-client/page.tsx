"use client";

import { useState } from "react";

/**
 * Este componente está marcado con "use client"
 * Se renderizará como placeholder en el servidor
 * y se hidratará en el cliente
 */
export default function UseClientPage() {
  const [count, setCount] = useState(0);

  return (
    <div className="container mx-auto py-12 px-4">
      <div className="max-w-2xl mx-auto space-y-6">
        <div>
          <h1 className="text-3xl font-bold mb-4">Componente con "use client"</h1>
          <p className="text-muted-foreground">
            Este componente está marcado con la directiva <code className="bg-muted px-1 rounded">"use client"</code>.
            Se renderiza como placeholder en el servidor y se hidrata en el cliente.
          </p>
        </div>

        <div className="p-6 border rounded-lg space-y-4">
          <div>
            <p className="text-sm text-muted-foreground mb-2">Contador interactivo:</p>
            <div className="flex items-center gap-4">
              <button
                onClick={() => setCount(count - 1)}
                className="px-4 py-2 border rounded hover:bg-muted"
              >
                -
              </button>
              <span className="text-2xl font-bold">{count}</span>
              <button
                onClick={() => setCount(count + 1)}
                className="px-4 py-2 border rounded hover:bg-muted"
              >
                +
              </button>
            </div>
          </div>

          <div className="pt-4 border-t">
            <p className="text-xs text-muted-foreground">
              💡 Este componente funciona tanto en navegación SPA como en carga directa por ruta.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

