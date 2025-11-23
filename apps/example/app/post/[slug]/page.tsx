import { useState } from "react";

export default function BlogCatchAllPage(props: any) {
  const slug = props?.params?.slug; // ej: "a/b/c"

  const [counter, setcounter] = useState(0);

  const handleClick = () => {
    setcounter(counter + 1);
  }

  return (
    <main className="space-y-2">
      <h2 className="text-lg font-semibold text-emerald-800">Blog catch-all</h2>
      <p>
        <strong>Raw slug:</strong> {slug}
      </p>
      <div className="text-xl">{counter}</div>
      <button onClick={handleClick}>Hace click amigo</button>
    </main>
  );
}
