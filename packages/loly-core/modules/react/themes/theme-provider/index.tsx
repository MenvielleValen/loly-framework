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

  // Initialize theme - priority: prop > window.__FW_DATA__ (from server) > cookie > default
  const getInitialTheme = (): string => {
    // 1. Use prop if provided (highest priority - explicitly passed from layout)
    if (initialTheme) return initialTheme;
    
    // 2. Use window.__FW_DATA__ from SSR (server already read cookie and injected it)
    if (typeof window !== "undefined") {
      const windowData = (window as any).__FW_DATA__;
      if (windowData?.theme) return windowData.theme;
    }
    
    // 3. Fallback to cookie (only if window.__FW_DATA__ not available yet)
    // This should rarely happen, but covers edge cases
    if (typeof window !== "undefined") {
      const cookieTheme = getCookie("theme");
      if (cookieTheme) return cookieTheme;
    }
    
    return "light";
  };

  const [theme, setTheme] = useState<string>(getInitialTheme);

  useEffect(() => {
    if (!themeMessage) return;
    if (themeMessage !== theme) {
      setTheme(themeMessage);
    }
  }, [themeMessage]);

  // Update body class when theme changes
  useEffect(() => {
    if (typeof document === "undefined") return;

    const body = document.body;
    const currentClasses = body.className.split(" ");
    
    // Remove old theme classes (light, dark, etc.)
    const themeClasses = ["light", "dark"];
    const filteredClasses = currentClasses.filter(
      (cls) => !themeClasses.includes(cls)
    );
    
    // Add new theme class
    body.className = [...filteredClasses, theme].filter(Boolean).join(" ");

    sendMessage(theme);
  }, [theme]);

  const handleThemeChange = (newTheme: string) => {
    setTheme(newTheme);

    // Set theme cookie
    document.cookie = `theme=${newTheme}; path=/; max-age=31536000`; // 1 year expiry
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
