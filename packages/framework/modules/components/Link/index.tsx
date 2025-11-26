import React from "react";

interface LinkProps extends React.AnchorHTMLAttributes<HTMLAnchorElement> {
  href: string;
  children: React.ReactNode;
}

/**
 * Link component for client-side navigation.
 *
 * @param props - Link component props
 * @returns Anchor element
 */
export const Link = ({ href, children, ...rest }: LinkProps) => {
  return (
    <a href={href} {...rest}>
      {children}
    </a>
  );
}
