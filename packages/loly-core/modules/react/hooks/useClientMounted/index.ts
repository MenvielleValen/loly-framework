import { useState, useEffect } from "react";

/**
 * Hook to detect if the component is mounted on the client.
 * Returns `false` during SSR and initial render, `true` after hydration.
 * 
 * Useful for avoiding hydration mismatches when rendering content that depends on client-side state.
 * 
 * @returns `true` if mounted on client, `false` during SSR
 * 
 * @example
 * ```tsx
 * function MyComponent() {
 *   const isMounted = useClientMounted();
 *   
 *   if (!isMounted) {
 *     return <div>Loading...</div>;
 *   }
 *   
 *   return <div>{window.innerWidth}</div>;
 * }
 * ```
 */
export function useClientMounted(): boolean {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  return mounted;
}

