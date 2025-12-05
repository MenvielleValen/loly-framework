import React from "react";
import { ThemeProvider } from "@lolyjs/core/themes";
import "./styles.css";

export default function RootLayout({
  children,
  theme,
}: {
  children: React.ReactNode;
  theme: string;
}) {
  return (
    <ThemeProvider initialTheme={theme}>
      <html lang="en">
        <body>{children}</body>
      </html>
    </ThemeProvider>
  );
}
