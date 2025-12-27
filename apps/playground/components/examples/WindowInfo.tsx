"use client";

import { useState, useEffect } from "react";

export function WindowInfo() {
  const [dimensions, setDimensions] = useState({
    width: typeof window !== "undefined" ? window.innerWidth : 0,
    height: typeof window !== "undefined" ? window.innerHeight : 0,
  });

  useEffect(() => {
    const updateDimensions = () => {
      setDimensions({
        width: window.innerWidth,
        height: window.innerHeight,
      });
    };

    updateDimensions();
    window.addEventListener("resize", updateDimensions);

    return () => {
      window.removeEventListener("resize", updateDimensions);
    };
  }, []);

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">Información de la Ventana</h3>
      <div className="grid grid-cols-2 gap-4">
        <div className="p-4 bg-background border rounded">
          <p className="text-sm text-muted-foreground">Ancho</p>
          <p className="text-2xl font-bold">{dimensions.width}px</p>
        </div>
        <div className="p-4 bg-background border rounded">
          <p className="text-sm text-muted-foreground">Alto</p>
          <p className="text-2xl font-bold">{dimensions.height}px</p>
        </div>
      </div>
      <p className="text-xs text-muted-foreground">
        Redimensiona la ventana para ver los cambios en tiempo real.
      </p>
    </div>
  );
}

