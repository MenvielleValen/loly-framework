import React, { useEffect, useState } from "react";
import { Link } from "@loly/core/modules/components";

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [theme, setTheme] = useState<"dark" | "light">("dark");

  // Persistencia del tema
  useEffect(() => {
    const saved = localStorage.getItem("theme") as "dark" | "light" | null;
    if (saved) setTheme(saved);
  }, []);

  useEffect(() => {
    document.body.className =
      theme === "dark"
        ? "bg-gray-900 text-gray-100"
        : "bg-gray-100 text-gray-900";
    localStorage.setItem("theme", theme);
  }, [theme]);

  return (
    <div className="min-h-screen flex flex-col font-sans">
      {/* HEADER */}
      <header className="sticky top-0 z-20 bg-gray-800 text-white px-6 py-4 shadow-lg flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            LolyFramework
            <span id="client-debug" className="text-sm opacity-70" />
          </h1>

          <p className="text-sm opacity-70 -mt-1">
            Demo layout – SSR + SPA navigation
          </p>
        </div>

        <button
          onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
          className="px-3 py-1 rounded bg-gray-700 hover:bg-gray-600 text-sm"
        >
          {theme === "dark" ? "Light mode" : "Dark mode"}
        </button>
      </header>

      {/* NAVBAR */}
      <nav className="bg-gray-700 text-gray-200 px-6 py-3 flex gap-6 text-sm shadow-inner">
        <Link href="/" className="hover:text-white">
          Home
        </Link>
        <Link href="/blog/test" className="hover:text-white">
          Blog Test
        </Link>
        <Link href="/blog/valenblog" className="hover:text-white">
          Blog With data
        </Link>
        <Link href="/post/hello-world" className="hover:text-white">
          Post Test
        </Link>
        <Link href="/dashboard" className="hover:text-white">
          Dashboard
        </Link>
        <Link href="/docs/getting-started" className="hover:text-white">
          Docs
        </Link>
        <Link href="/about" className="hover:text-white">
          About
        </Link>
      </nav>

      {/* MAIN CONTENT */}
      <main className="flex-1 px-6 py-8">{children}</main>

      {/* FOOTER */}
      <footer className="mt-8 py-6 text-center text-sm opacity-60">
        <p>LolyFramework – Layout global (SSR + SPA)</p>
        <p>Hot Reload, Routing, Loaders, Metadata, SSG/SSR</p>
      </footer>
    </div>
  );
}
