import React, { useState, useEffect, type ReactNode } from "react";

export interface ClientOnlyProps {
  /**
   * Content to render only on the client.
   * This will be `null` during SSR and initial render.
   */
  children: ReactNode;
  
  /**
   * Fallback content to show during SSR and before hydration.
   * If not provided, nothing is rendered during SSR.
   */
  fallback?: ReactNode;
}

/**
 * Component that only renders its children on the client.
 * 
 * Useful for components that:
 * - Use browser-only APIs (window, document, localStorage, etc.)
 * - Depend on client-side state that doesn't exist during SSR
 * - Cause hydration mismatches
 * 
 * During SSR and initial render, this component renders `fallback` (or `null`).
 * After hydration, it renders `children`.
 * 
 * @example
 * ```tsx
 * // Basic usage
 * <ClientOnly>
 *   <ComponentThatUsesWindow />
 * </ClientOnly>
 * 
 * // With fallback
 * <ClientOnly fallback={<div>Loading...</div>}>
 *   <InteractiveComponent />
 * </ClientOnly>
 * ```
 */
export function ClientOnly({ children, fallback = null }: ClientOnlyProps): ReactNode {
  const [hasMounted, setHasMounted] = useState(false);

  useEffect(() => {
    setHasMounted(true);
  }, []);

  if (!hasMounted) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
}

