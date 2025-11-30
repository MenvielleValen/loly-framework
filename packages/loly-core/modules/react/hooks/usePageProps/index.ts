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
  const [props, setProps] = useState({
    params: {},
    props: {},
  });

  useEffect(() => {
    // Load initial data
    if ((window as any)?.__FW_DATA__) {
      setProps((window as any).__FW_DATA__);
    }

    // Listen for data refresh events (from revalidate())
    const handleDataRefresh = () => {
      if ((window as any)?.__FW_DATA__) {
        setProps((window as any).__FW_DATA__);
      }
    };

    window.addEventListener("fw-data-refresh", handleDataRefresh);

    return () => {
      window.removeEventListener("fw-data-refresh", handleDataRefresh);
    };
  }, []);

  return props;
};
