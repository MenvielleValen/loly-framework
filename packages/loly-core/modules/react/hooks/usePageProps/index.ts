import React, { useEffect, useState } from "react";

/**
 * Hook to access page props and route parameters.
 *
 * Reads initial data from window.__FW_DATA__ set during SSR.
 * Automatically updates when `revalidate()` is called.
 * @deprecated Use server side props instead
 * @template P - Type for page props (default: any)
 * @template T - Type for route params (default: any)
 * @returns Object containing params and props
 *
 * @example
 * // With props type only
 * const { props } = usePageProps<{ title: string }>();
 *
 * @example
 * // With both props and params types
 * const { props, params } = usePageProps<{ title: string }, { id: string }>();
 */
export function usePageProps<P = any, T = any>(): { params: T, props: P } {
  const [state, setState] = useState<{ params: T, props: P }>(() => {
    // Initialize with current data if available
    if (typeof window !== "undefined" && (window as any)?.__FW_DATA__) {
      const data = (window as any).__FW_DATA__;
      return {
        params: data.params || {} as T,
        props: data.props || {} as P,
      };
    }
    return {
      params: {} as T,
      props: {} as P,
    };
  });

  useEffect(() => {
    // Listen for data refresh events (from revalidate() or navigation)
    const handleDataRefresh = () => {
      if ((window as any)?.__FW_DATA__) {
        const data = (window as any).__FW_DATA__;
        setState({
          params: data.params || {} as T,
          props: data.props || {} as P,
        });
      }
    };

    window.addEventListener("fw-data-refresh", handleDataRefresh);

    return () => {
      window.removeEventListener("fw-data-refresh", handleDataRefresh);
    };
  }, []);

  return { params: state.params as T, props: state.props as P };
};
