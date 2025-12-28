import React from "react";
import { Header } from "@/components/header";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <div>
      <Header downloads={null} />
      <main>{children}</main>
    </div>
  );
}

