import React from "react";

import { Link } from '@loly/core/modules/components';

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div
      className="bg-gray-700 text-white"
      style={{
        fontFamily: "system-ui, sans-serif",
        padding: 20,
      }}
    >
      <header style={{ marginBottom: 20 }}>
        <h1>
          My Framework Dev
          <span id="client-debug" />
        </h1>
        <nav className="flex gap-6">
          <Link href="/">Home</Link>
          <Link href="/blog/test">Blog test</Link>
          <Link href="/post/hello-world">Post test</Link>
        </nav>
      </header>
      <section>{children}</section>
      <footer style={{ marginTop: 40, fontSize: 12, opacity: 0.7 }}>
        <p>Root layout – aplica a todas las rutas</p>
      </footer>
    </div>
  );
}
