import React from "react";
import { prefetchRouteData } from "../../cache/index";

interface LinkProps extends React.AnchorHTMLAttributes<HTMLAnchorElement> {
  href: string;
  children: React.ReactNode;
  prefetch?: boolean;
}

import { useEffect, useRef } from "react"; 

function isExternal(href: string) {
  try {
    const url = new URL(href, window.location.href);
    return url.origin !== window.location.origin;
  } catch {
    return false;
  }
}

export function Link({
  href,
  prefetch = true,
  children,
  ...rest
}: React.PropsWithChildren<{
  href: string;
  prefetch?: boolean;
}> &
  React.AnchorHTMLAttributes<HTMLAnchorElement>) {
  const ref = useRef<HTMLAnchorElement | null>(null);

  useEffect(() => {
    if (!prefetch || !ref.current || isExternal(href)) return;

    const el = ref.current;
    let prefetched = false;

    const io = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting && !prefetched) {
        prefetched = true;
        prefetchRouteData(href);
      }
    });

    io.observe(el);
    return () => io.disconnect();
  }, [href, prefetch]);

  return (
    <a ref={ref} href={href} {...rest}>
      {children}
    </a>
  );
}
