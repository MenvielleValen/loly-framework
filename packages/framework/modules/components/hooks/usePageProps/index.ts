import React, { useEffect, useState } from "react";

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
