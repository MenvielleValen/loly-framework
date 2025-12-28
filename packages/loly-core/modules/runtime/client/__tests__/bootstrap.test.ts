import { describe, it, expect } from "vitest";
import { shouldClientTakeover } from "../bootstrap";

describe("shouldClientTakeover", () => {
  it("returns true when page is client component", () => {
    const routeDeps = { isPageClientComponent: true };
    expect(shouldClientTakeover(routeDeps)).toBe(true);
  });

  it("returns true when any layout is client component", () => {
    const routeDeps = { isLayoutClientComponent: [false, true, false] };
    expect(shouldClientTakeover(routeDeps)).toBe(true);
  });

  it("returns true when there are direct client components", () => {
    const routeDeps = { allClientComponents: ["components/ui/theme-switcher.client.tsx"] };
    expect(shouldClientTakeover(routeDeps)).toBe(true);
  });

  it("returns false when no client components are present", () => {
    const routeDeps = { isPageClientComponent: false, isLayoutClientComponent: [false], allClientComponents: [] };
    expect(shouldClientTakeover(routeDeps)).toBe(false);
  });
});

