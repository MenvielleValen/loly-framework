import React, { createContext, useContext, useState, useEffect } from "react";

export const ThemeContext = createContext<{
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
  // Initialize theme from multiple sources (priority order):
  // 1. initialTheme prop (from server)
  // 2. window.__FW_DATA__.theme (from SSR)
  // 3. cookie
  // 4. default "light"
  const getInitialTheme = (): string => {
    if (initialTheme) return initialTheme;
    
    if (typeof window !== "undefined") {
      const windowData = (window as any).__FW_DATA__;
      if (windowData?.theme) return windowData.theme;
      
      const cookieTheme = getCookie("theme");
      if (cookieTheme) return cookieTheme;
    }
    
    return "light";
  };

  const [theme, setTheme] = useState<string>(getInitialTheme);

  // Sync with cookie on mount (in case cookie changed externally)
  useEffect(() => {
    const cookieTheme = getCookie("theme");
    if (cookieTheme && cookieTheme !== theme) {
      setTheme(cookieTheme);
    }
  }, []);

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
