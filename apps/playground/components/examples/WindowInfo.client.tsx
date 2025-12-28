import { useState, useEffect } from "react";

export function WindowInfo() {
  // Critical: always initialize with 0 to avoid hydration mismatch
  // The component mounts with createRoot after hydration,
  // but if it renders during hydration it must stay consistent
  const [dimensions, setDimensions] = useState({
    width: 0,
    height: 0,
  });

  useEffect(() => {
    // Only update after the client has mounted
    const updateDimensions = () => {
      setDimensions({
        width: window.innerWidth,
        height: window.innerHeight,
      });
    };

    // Update immediately on mount
    updateDimensions();
    window.addEventListener("resize", updateDimensions);

    return () => {
      window.removeEventListener("resize", updateDimensions);
    };
  }, []);

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">Window Information</h3>
      <div className="grid grid-cols-2 gap-4">
        <div className="p-4 bg-background border rounded">
          <p className="text-sm text-muted-foreground">Width</p>
          <p className="text-2xl font-bold">{dimensions.width}px</p>
        </div>
        <div className="p-4 bg-background border rounded">
          <p className="text-sm text-muted-foreground">Height</p>
          <p className="text-2xl font-bold">{dimensions.height}px</p>
        </div>
      </div>
      <p className="text-xs text-muted-foreground">
        Resize the window to see changes in real time.
      </p>
    </div>
  );
}

