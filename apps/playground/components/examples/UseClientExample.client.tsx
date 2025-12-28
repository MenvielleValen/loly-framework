import { useState } from "react";

/**
 * This component is marked with .client.tsx extension
 * It will render as a placeholder on the server
 * and mount on the client using createRoot
 */
export function UseClientExample() {
  const [count, setCount] = useState(0);

  return (
    <div className="p-6 border rounded-lg space-y-4">
      <div>
        <p className="text-sm text-muted-foreground mb-2">Interactive counter:</p>
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
          💡 This component works in both SPA navigation and direct route load.
        </p>
      </div>
    </div>
  );
}

