import { useRouter } from "@lolyjs/core/hooks";
import { useState } from "react";

export default function FocusTest() {
  const [value, setValue] = useState("");
  const router = useRouter();

  return (
    <div style={{ padding: 40 }}>
      <input
        value={value}
        onChange={(e) => setValue(e.target.value)}
        style={{ border: "1px solid #ccc", padding: 8 }}
      />
    </div>
  );
}
