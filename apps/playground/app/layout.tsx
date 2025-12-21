import React from "react";
import { ThemeProvider } from "@lolyjs/core/themes";

type LayoutProps = {
  children: React.ReactNode;
  // Props from page server.hook.ts (if any) - can be used here too
  theme?: string;
};

export default function RootLayout(props: LayoutProps) {
  const { children, theme } = props;

  return (
    <ThemeProvider initialTheme={theme}>
      {children}
    </ThemeProvider>
  );
}
