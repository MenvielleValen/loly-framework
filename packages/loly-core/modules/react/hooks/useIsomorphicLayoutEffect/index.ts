import { useEffect, useLayoutEffect } from "react";

/**
 * Hook that uses `useLayoutEffect` on the client and `useEffect` (no-op) on the server.
 * 
 * This prevents React warnings about using `useLayoutEffect` during SSR.
 * `useLayoutEffect` runs synchronously after DOM mutations but before paint,
 * making it ideal for DOM measurements and synchronous updates.
 * 
 * @param effect - Effect function
 * @param deps - Dependency array
 * 
 * @example
 * ```tsx
 * function MyComponent() {
 *   useIsomorphicLayoutEffect(() => {
 *     // This runs synchronously on client, not on server
 *     const width = elementRef.current?.offsetWidth;
 *     setWidth(width);
 *   }, []);
 *   
 *   return <div ref={elementRef}>Content</div>;
 * }
 * ```
 */
export function useIsomorphicLayoutEffect(
  effect: React.EffectCallback,
  deps?: React.DependencyList
): void {
  if (typeof window === "undefined") {
    // Server: use useEffect (no-op during SSR)
    useEffect(effect, deps);
  } else {
    // Client: use useLayoutEffect for synchronous execution
    useLayoutEffect(effect, deps);
  }
}

