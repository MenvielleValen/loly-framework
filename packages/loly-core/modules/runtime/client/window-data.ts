import { WINDOW_DATA_KEY } from "./constants";
import type { InitialData } from "./types";

export function getWindowData(): InitialData | null {
  return ((window as any)[WINDOW_DATA_KEY] as InitialData | undefined) ?? null;
}

export function setWindowData(data: InitialData): void {
  (window as any)[WINDOW_DATA_KEY] = data;
}

export function getCurrentTheme(): string | null {
  return getWindowData()?.theme ?? null;
}

