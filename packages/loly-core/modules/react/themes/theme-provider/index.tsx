import React, { createContext, useContext, useState, useEffect } from "react";
import { useBroadcastChannel } from "../../hooks/useBroadcastChannel";

const ThemeContext = createContext<{
  theme: string;
  handleThemeChange: (theme: string) => void;
}>({ theme: "light", handleThemeChange: () => {} });

// Helper function to get cookie value
function getCookie(name: string): string | null {
  if (typeof document === "undefined") return null;
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) {
    return parts.pop()?.split(";").shift() || null;
  }
  return null;
}

export const ThemeProvider = ({ 
  children,
  initialTheme 
}: { 
  children: React.ReactNode;
  initialTheme?: string;
}) => {
  const { message: themeMessage, sendMessage } = useBroadcastChannel('theme_channel');

  // Initialize theme consistently between server and client
  // The server renders with initialTheme, and we must use the same value on client
  // to avoid hydration mismatch. Priority: initialTheme prop > window.__FW_DATA__ > cookie > default
  const [theme, setTheme] = useState<string>(() => {
    // 1. Use prop if provided (this should match what server rendered)
    if (initialTheme) return initialTheme;
    
    // 2. On client, use window.__FW_DATA__ from SSR (this is set before hydration)
    // This ensures consistency between server and client
    if (typeof window !== "undefined") {
      const windowData = (window as any).__FW_DATA__;
      if (windowData?.theme) return windowData.theme;
    }
    
    // 3. Fallback to cookie (only if window.__FW_DATA__ not available yet)
    if (typeof window !== "undefined") {
      const cookieTheme = getCookie("theme");
      if (cookieTheme) return cookieTheme;
    }
    
    // Default fallback
    return "light";
  });

  // Listen for theme changes from broadcast channel (other tabs/windows)
  useEffect(() => {
    if (!themeMessage) return;
    if (themeMessage !== theme) {
      setTheme(themeMessage);
    }
  }, [themeMessage, theme]);

  // Listen for theme changes from window.__FW_DATA__ during SPA navigation
  useEffect(() => {
    const handleDataRefresh = () => {
      if (typeof window !== "undefined") {
        const windowData = (window as any).__FW_DATA__;
        if (windowData?.theme) {
          // Use functional update to avoid stale closure
          setTheme((currentTheme) => {
            if (windowData.theme !== currentTheme) {
              return windowData.theme;
            }
            return currentTheme;
          });
        }
      }
    };

    window.addEventListener("fw-data-refresh", handleDataRefresh);

    return () => {
      window.removeEventListener("fw-data-refresh", handleDataRefresh);
    };
  }, []);

  // Update theme when initialTheme prop changes (e.g., during SPA navigation)
  // This is the primary way theme updates during SPA navigation when layout re-renders
  useEffect(() => {
    if (initialTheme) {
      // Always update if initialTheme is provided, even if it's the same
      // This ensures theme syncs correctly during SPA navigation
      setTheme(initialTheme);
    }
  }, [initialTheme]);

  // Update body class when theme changes (skip during initial hydration to avoid mismatch)
  useEffect(() => {
    if (typeof document === "undefined") return;

    const body = document.body;
    const currentClasses = body.className.split(" ").filter(Boolean);
    
    // Remove old theme classes (light, dark, etc.)
    const themeClasses = ["light", "dark"];
    const filteredClasses = currentClasses.filter(
      (cls) => !themeClasses.includes(cls)
    );
    
    // Add new theme class
    const newClassName = [...filteredClasses, theme].filter(Boolean).join(" ");
    
    // Only update if different to avoid unnecessary DOM updates
    if (body.className !== newClassName) {
      body.className = newClassName;
    }

    sendMessage(theme);
  }, [theme, sendMessage]);

  const handleThemeChange = (newTheme: string) => {
    setTheme(newTheme);

    // Set theme cookie
    document.cookie = `theme=${newTheme}; path=/; max-age=31536000`; // 1 year expiry

    // Update window.__FW_DATA__.theme so getCurrentTheme() returns the correct value during navigation
    if (typeof window !== "undefined" && (window as any).__FW_DATA__) {
      (window as any).__FW_DATA__ = {
        ...(window as any).__FW_DATA__,
        theme: newTheme,
      };
    }
  };

  return (
    <ThemeContext.Provider value={{ theme, handleThemeChange }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  return useContext(ThemeContext);
};
