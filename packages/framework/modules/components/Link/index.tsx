import React from "react";

interface LinkProps extends React.AnchorHTMLAttributes<HTMLAnchorElement> {
  href: string;
  children: React.ReactNode;
}

export const Link = ({ href, children, ...rest }: LinkProps) => {
  return (
    <a href={href} {...rest}>
      {children}
    </a>
  );
}
