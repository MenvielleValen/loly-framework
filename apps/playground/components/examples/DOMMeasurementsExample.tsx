"use client";

import { useState, useRef } from "react";
import { useIsomorphicLayoutEffect, useClientMounted } from "@lolyjs/core/hooks";

export function DOMMeasurementsExample() {
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
  const containerRef = useRef<HTMLDivElement>(null);
  const isMounted = useClientMounted();

  useIsomorphicLayoutEffect(() => {
    if (!containerRef.current || !isMounted) return;

    const updateDimensions = () => {
      if (containerRef.current) {
        setDimensions({
          width: containerRef.current.offsetWidth,
          height: containerRef.current.offsetHeight,
        });
      }
    };

    updateDimensions();

    const resizeObserver = new ResizeObserver(updateDimensions);
    if (containerRef.current) {
      resizeObserver.observe(containerRef.current);
    }

    return () => {
      resizeObserver.disconnect();
    };
  }, [isMounted]);

  if (!isMounted) {
    return <div className="h-32 bg-muted rounded animate-pulse" />;
  }

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">Mediciones del Contenedor</h3>
      
      <div
        ref={containerRef}
        className="p-6 border-2 border-dashed rounded-lg bg-muted/20 resize overflow-auto"
        style={{ minHeight: "200px", minWidth: "200px" }}
      >
        <p className="text-sm text-muted-foreground mb-4">
          Redimensiona este contenedor arrastrando la esquina inferior derecha.
        </p>
        <div className="grid grid-cols-2 gap-4">
          <div className="p-3 bg-background border rounded">
            <p className="text-xs text-muted-foreground">Ancho</p>
            <p className="text-xl font-bold">{dimensions.width}px</p>
          </div>
          <div className="p-3 bg-background border rounded">
            <p className="text-xs text-muted-foreground">Alto</p>
            <p className="text-xl font-bold">{dimensions.height}px</p>
          </div>
        </div>
      </div>

      <p className="text-xs text-muted-foreground">
        Las mediciones se actualizan síncronamente usando <code>useIsomorphicLayoutEffect</code>,
        evitando layout shifts y warnings de React en SSR.
      </p>
    </div>
  );
}

