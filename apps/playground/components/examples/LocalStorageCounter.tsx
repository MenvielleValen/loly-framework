"use client";

import { useState, useEffect } from "react";

const STORAGE_KEY = "loly-playground-counter";

export function LocalStorageCounter() {
  const [count, setCount] = useState(0);
  const [isLoaded, setIsLoaded] = useState(false);

  // Load from localStorage on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved !== null) {
        setCount(parseInt(saved, 10));
      }
      setIsLoaded(true);
    } catch (error) {
      console.error("Failed to load from localStorage:", error);
      setIsLoaded(true);
    }
  }, []);

  // Save to localStorage whenever count changes
  useEffect(() => {
    if (isLoaded) {
      try {
        localStorage.setItem(STORAGE_KEY, count.toString());
      } catch (error) {
        console.error("Failed to save to localStorage:", error);
      }
    }
  }, [count, isLoaded]);

  if (!isLoaded) {
    return <div className="h-32 bg-muted rounded animate-pulse" />;
  }

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">Contador Persistente</h3>
      <p className="text-sm text-muted-foreground">
        Este contador se guarda en localStorage y persiste entre recargas.
      </p>
      <div className="flex items-center gap-4">
        <button
          onClick={() => setCount(count - 1)}
          className="px-4 py-2 border rounded hover:bg-muted"
        >
          -
        </button>
        <span className="text-3xl font-bold min-w-[60px] text-center">{count}</span>
        <button
          onClick={() => setCount(count + 1)}
          className="px-4 py-2 border rounded hover:bg-muted"
        >
          +
        </button>
        <button
          onClick={() => {
            setCount(0);
            localStorage.removeItem(STORAGE_KEY);
          }}
          className="px-4 py-2 border rounded hover:bg-muted text-sm"
        >
          Reset
        </button>
      </div>
      <p className="text-xs text-muted-foreground">
        Recarga la página para ver que el valor persiste.
      </p>
    </div>
  );
}

