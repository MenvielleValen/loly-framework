import { WINDOW_DATA_KEY, ROUTER_DATA_KEY } from "./constants";
import type { InitialData, RouterData } from "./types";

export function getWindowData(): InitialData | null {
  if (typeof window === "undefined") {
    return null;
  }
  return (window[WINDOW_DATA_KEY] as InitialData | undefined) ?? null;
}

export function getRouterData(): RouterData | null {
  if (typeof window === "undefined") {
    return null;
  }
  return (window[ROUTER_DATA_KEY] as RouterData | undefined) ?? null;
}

export function setWindowData(data: InitialData): void {
  window[WINDOW_DATA_KEY] = data;
  
  // Dispatch event for components to listen to (e.g. ThemeProvider)
  // This ensures components update when navigating in SPA mode
  if (typeof window !== "undefined") {
    window.dispatchEvent(
      new CustomEvent("fw-data-refresh", {
        detail: { data },
      })
    );
  }
}

export function setRouterData(data: RouterData): void {
  window[ROUTER_DATA_KEY] = data;
  
  // Dispatch event for router data updates
  if (typeof window !== "undefined") {
    window.dispatchEvent(
      new CustomEvent("fw-router-data-refresh", {
        detail: { data },
      })
    );
  }
}

export function getCurrentTheme(): string | null {
  return getWindowData()?.theme ?? null;
}

