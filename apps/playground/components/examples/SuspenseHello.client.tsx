import { useEffect, useState } from "react";

export default function SuspenseHello() {
  const [message, setMessage] = useState<string>("Preparing hello...");

  useEffect(() => {
    const id = setTimeout(() => {
      setMessage("Hello from a lazy client island!");
    }, 600);
    return () => clearTimeout(id);
  }, []);

  return (
    <div className="rounded-md bg-background border p-4 space-y-2">
      <p className="text-sm text-muted-foreground">Lazy island</p>
      <p className="font-semibold">{message}</p>
    </div>
  );
}

