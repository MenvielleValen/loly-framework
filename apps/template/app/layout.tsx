import React from "react";
type LayoutProps = {
  children: React.ReactNode;
};

export default function RootLayout(props: LayoutProps) {
  const { children } = props;

  return (
    <>{children}</>
  );
}
