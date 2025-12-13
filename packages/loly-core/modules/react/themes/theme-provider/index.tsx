import React, { createContext, useContext, useState, useEffect, useRef } from "react";
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
  
  // Track what we last sent to avoid loops
  const lastSentRef = useRef<string | null>(null);

  // Initialize theme consistently between server and client
  const [theme, setTheme] = useState<string>(() => {
    if (initialTheme) return initialTheme;
    
    if (typeof window !== "undefined") {
      const windowData = (window as any).__FW_DATA__;
      if (windowData?.theme) return windowData.theme;
    }
    
    if (typeof window !== "undefined") {
      const cookieTheme = getCookie("theme");
      if (cookieTheme) return cookieTheme;
    }
    
    return "light";
  });

  // Handle messages from broadcast channel (other tabs)
  // This effect ONLY responds to themeMessage changes, not theme changes
  useEffect(() => {
    if (!themeMessage) return;
    
    // Ignore if this is a message we just sent
    if (themeMessage === lastSentRef.current) {
      lastSentRef.current = null;
      return;
    }
    
    // Only update if different from current theme
    setTheme((currentTheme) => {
      if (themeMessage !== currentTheme) {
        // Update cookie
        if (typeof document !== "undefined") {
          document.cookie = `theme=${themeMessage}; path=/; max-age=31536000`;
        }
        
        // Update window data
        if (typeof window !== "undefined") {
          if (!(window as any).__FW_DATA__) {
            (window as any).__FW_DATA__ = {};
          }
          (window as any).__FW_DATA__ = {
            ...(window as any).__FW_DATA__,
            theme: themeMessage,
          };
        }
        
        return themeMessage;
      }
      return currentTheme;
    });
  }, [themeMessage]); // Only depend on themeMessage, NOT theme!

  // Handle window.__FW_DATA__ changes during SPA navigation
  useEffect(() => {
    const handleDataRefresh = () => {
      if (typeof window !== "undefined") {
        const windowData = (window as any).__FW_DATA__;
        if (windowData?.theme) {
          setTheme((currentTheme) => {
            if (windowData.theme !== currentTheme) {
              return windowData.theme;
            }
            return currentTheme;
          });
        }
      }
    };

    if (typeof window !== "undefined") {
      window.addEventListener("fw-data-refresh", handleDataRefresh);
      return () => {
        window.removeEventListener("fw-data-refresh", handleDataRefresh);
      };
    }
  }, []); // No dependencies - event listener doesn't need theme

  // Handle initialTheme prop changes
  useEffect(() => {
    if (initialTheme && initialTheme !== theme) {
      setTheme(initialTheme);
    }
  }, [initialTheme]); // Only depend on initialTheme, not theme

  // Update body class when theme changes
  useEffect(() => {
    if (typeof document === "undefined") return;

    const body = document.body;
    const currentClasses = body.className.split(" ").filter(Boolean);
    const themeClasses = ["light", "dark"];
    const filteredClasses = currentClasses.filter(
      (cls) => !themeClasses.includes(cls)
    );
    const newClassName = [...filteredClasses, theme].filter(Boolean).join(" ");
    
    if (body.className !== newClassName) {
      body.className = newClassName;
    }
  }, [theme]);

  const handleThemeChange = (newTheme: string) => {
    // Update state immediately
    setTheme(newTheme);

    // Update cookie
    if (typeof document !== "undefined") {
      document.cookie = `theme=${newTheme}; path=/; max-age=31536000`;
    }

    // Update window data
    if (typeof window !== "undefined") {
      if (!(window as any).__FW_DATA__) {
        (window as any).__FW_DATA__ = {};
      }
      (window as any).__FW_DATA__ = {
        ...(window as any).__FW_DATA__,
        theme: newTheme,
      };
    }
    
    // Mark this as the last value we sent
    lastSentRef.current = newTheme;
    
    // Broadcast to other tabs
    sendMessage(newTheme);
    
    // Clear the ref after a delay
    setTimeout(() => {
      if (lastSentRef.current === newTheme) {
        lastSentRef.current = null;
      }
    }, 500);
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
