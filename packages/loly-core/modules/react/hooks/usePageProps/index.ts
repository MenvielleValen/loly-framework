import React, { useEffect, useState } from "react";

/**
 * Hook to access page props and route parameters.
 *
 * Reads initial data from window.__FW_DATA__ set during SSR.
 *
 * @returns Object containing params and props
 */
export const usePageProps = () => {
  const [props, setProps] = useState({
    params: {},
    props: {},
  });

  useEffect(() => {
    if ((window as any)?.__FW_DATA__) {
      setProps((window as any).__FW_DATA__);
    }
  }, []);

  return props;
};
