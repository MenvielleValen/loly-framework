import { Moon, Sun } from "lucide-react";
import React from "react";

const THEME_CHANNEL = "loly_theme_channel";

const readTheme = (): "light" | "dark" => {
  if (typeof window === "undefined") return "light";
  const api = (window as any).loly?.theme;
  if (api?.get) return api.get();
  if (document.body?.classList.contains("dark")) return "dark";
  if (document.documentElement?.classList.contains("dark")) return "dark";
  return "light";
};

/**
 * Improved ThemeSwitch version using global theme API.
 * This component uses the global loly.theme API with BroadcastChannel
 * for cross-tab synchronization.
 */
export function ImprovedThemeSwitch() {
  const [theme, setTheme] = React.useState<"light" | "dark">("light");

  React.useEffect(() => {
    setTheme(readTheme());

    let channel: BroadcastChannel | null = null;
    if (typeof BroadcastChannel !== "undefined") {
      channel = new BroadcastChannel(THEME_CHANNEL);
      channel.onmessage = (event) => {
        const next = event?.data?.theme;
        if (typeof next === "string") {
          setTheme(next === "dark" ? "dark" : "light");
        }
      };
    }

    const handleRefresh = () => setTheme(readTheme());
    window.addEventListener("fw-data-refresh", handleRefresh);

    return () => {
      if (channel) channel.close();
      window.removeEventListener("fw-data-refresh", handleRefresh);
    };
  }, []);

  const handleSwitch = () => {
    const nextTheme = theme === "dark" ? "light" : "dark";
    if (typeof window !== "undefined" && (window as any).loly?.theme?.set) {
      (window as any).loly.theme.set(nextTheme);
    }
    setTheme(nextTheme);
  };

  return (
    <button
      onClick={handleSwitch}
      className="relative inline-flex h-9 w-16 items-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background bg-muted hover:bg-muted/80"
      aria-label="Toggle theme"
    >
      {/* Track background with gradient */}
      <span
        className={`absolute inset-0 rounded-full transition-all duration-300 ${
          theme === "dark"
            ? "bg-linear-to-r from-indigo-500 to-purple-600"
            : "bg-linear-to-r from-amber-400 to-orange-500"
        }`}
      />

      {/* Sliding thumb */}
      <span
        className={`relative z-10 inline-flex h-7 w-7 items-center justify-center rounded-full bg-background shadow-lg transition-transform duration-300 ease-in-out ${
          theme === "dark" ? "translate-x-8" : "translate-x-1"
        }`}
      >
        {theme === "dark" ? (
          <Moon className="h-4 w-4 text-purple-600 dark:text-purple-400" />
        ) : (
          <Sun className="h-4 w-4 text-orange-500" />
        )}
      </span>

      {/* Background icons */}
      <span className="absolute inset-0 flex items-center justify-between px-2 pointer-events-none">
        <Sun
          className={`h-3.5 w-3.5 transition-opacity duration-300 ${
            theme === "light" ? "opacity-0" : "opacity-60 text-white"
          }`}
        />
        <Moon
          className={`h-3.5 w-3.5 transition-opacity duration-300 ${
            theme === "dark" ? "opacity-0" : "opacity-60 text-white"
          }`}
        />
      </span>
    </button>
  );
}

