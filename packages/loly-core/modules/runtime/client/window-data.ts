import { WINDOW_DATA_KEY } from "./constants";
import type { InitialData } from "./types";

export function getWindowData(): InitialData | null {
  return ((window as any)[WINDOW_DATA_KEY] as InitialData | undefined) ?? null;
}

export function setWindowData(data: InitialData): void {
  (window as any)[WINDOW_DATA_KEY] = data;
  
  // Dispatch event for components to listen to (e.g., usePageProps, ThemeProvider)
  // This ensures components update when navigating in SPA mode
  if (typeof window !== "undefined") {
    window.dispatchEvent(
      new CustomEvent("fw-data-refresh", {
        detail: { data },
      })
    );
  }
}

export function getCurrentTheme(): string | null {
  return getWindowData()?.theme ?? null;
}

