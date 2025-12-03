import React, { useEffect, useState } from "react";

/**
 * Hook to access page props and route parameters.
 *
 * Reads initial data from window.__FW_DATA__ set during SSR.
 * Automatically updates when `revalidate()` is called.
 *
 * @returns Object containing params and props
 */
export const usePageProps = () => {
  const [props, setProps] = useState(() => {
    // Initialize with current data if available
    if (typeof window !== "undefined" && (window as any)?.__FW_DATA__) {
      const data = (window as any).__FW_DATA__;
      return {
        params: data.params || {},
        props: data.props || {},
      };
    }
    return {
      params: {},
      props: {},
    };
  });

  useEffect(() => {
    // Listen for data refresh events (from revalidate() or navigation)
    const handleDataRefresh = () => {
      if ((window as any)?.__FW_DATA__) {
        const data = (window as any).__FW_DATA__;
        setProps({
          params: data.params || {},
          props: data.props || {},
        });
      }
    };

    window.addEventListener("fw-data-refresh", handleDataRefresh);

    return () => {
      window.removeEventListener("fw-data-refresh", handleDataRefresh);
    };
  }, []);

  return props;
};
