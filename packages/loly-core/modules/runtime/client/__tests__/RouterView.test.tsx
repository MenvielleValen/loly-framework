import React from "react";
import { describe, it, expect } from "vitest";
import { RouterView } from "../RouterView";
import type { RouteViewState } from "../types";

function createState(overrides: Partial<RouteViewState> = {}): RouteViewState {
  return {
    url: "/",
    params: {},
    props: {},
    route: { pattern: "/" } as any,
    components: {
      Page: () => React.createElement("div", null, "page"),
      layouts: [],
      isPageClientComponent: false,
      isLayoutClientComponent: [],
      clientComponentFilePaths: {},
      ...overrides.components,
    },
    ...overrides,
  };
}

describe("RouterView", () => {
  it("renders null for client page components during hydration", () => {
    const state = createState({
      components: {
        Page: () => React.createElement("div", null, "page"),
        layouts: [],
        isPageClientComponent: true,
        isLayoutClientComponent: [],
        clientComponentFilePaths: { page: "app/page.tsx" },
      },
    });

    const element = RouterView({ state });
    expect(element).toBeNull();
  });

  it("renders layout tree when not client component", () => {
    const Layout = ({ children }: any) => React.createElement("section", null, children);
    const state = createState({
      components: {
        Page: () => React.createElement("div", null, "page"),
        layouts: [Layout],
        isPageClientComponent: false,
        isLayoutClientComponent: [false],
        clientComponentFilePaths: {},
      },
    });

    const element: any = RouterView({ state });
    expect(element?.type).toBe(Layout);
  });
});

