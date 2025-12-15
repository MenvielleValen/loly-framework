import { WINDOW_DATA_KEY, ROUTER_DATA_KEY } from "./constants";
import type { InitialData, RouterData } from "./types";

const LAYOUT_PROPS_KEY = "__FW_LAYOUT_PROPS__";

export function getWindowData(): InitialData | null {
  if (typeof window === "undefined") {
    return null;
  }
  return (window[WINDOW_DATA_KEY] as InitialData | undefined) ?? null;
}

/**
 * Gets preserved layout props from window storage.
 * Layout props are preserved across SPA navigations when layout hooks are skipped.
 */
export function getPreservedLayoutProps(): Record<string, any> | null {
  if (typeof window === "undefined") {
    return null;
  }
  return ((window as any)[LAYOUT_PROPS_KEY] as Record<string, any> | undefined) ?? null;
}

/**
 * Sets preserved layout props in window storage.
 * These props are used when layout hooks are skipped in SPA navigation.
 */
export function setPreservedLayoutProps(props: Record<string, any> | null): void {
  if (typeof window === "undefined") {
    return;
  }
  if (props === null) {
    delete (window as any)[LAYOUT_PROPS_KEY];
  } else {
    (window as any)[LAYOUT_PROPS_KEY] = props;
  }
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

