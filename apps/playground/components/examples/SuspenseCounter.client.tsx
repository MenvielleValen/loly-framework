import { useEffect, useState } from "react";

export default function SuspenseCounter() {
  const [count, setCount] = useState(0);

  useEffect(() => {
    const id = setInterval(() => setCount((c) => c + 1), 500);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="rounded-md bg-background border p-4 space-y-2">
      <p className="text-sm text-muted-foreground">Lazy counter island</p>
      <p className="text-2xl font-semibold">{count}</p>
    </div>
  );
}

