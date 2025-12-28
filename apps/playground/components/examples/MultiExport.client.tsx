import { useState } from "react";

export default function PrimaryButton() {
  const [clicks, setClicks] = useState(0);
  return (
    <button
      className="px-3 py-2 rounded bg-primary text-primary-foreground text-sm"
      onClick={() => setClicks((c) => c + 1)}
    >
      Primary (default export) — {clicks}
    </button>
  );
}

export function SecondaryButton() {
  const [clicks, setClicks] = useState(0);
  return (
    <button
      className="px-3 py-2 rounded border text-sm"
      onClick={() => setClicks((c) => c + 1)}
    >
      Secondary (named export) — {clicks}
    </button>
  );
}

