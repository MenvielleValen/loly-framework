import React from "react";
import { createRoot } from "react-dom/client";

type ClientComponentLoaders = Record<string, () => Promise<any>>;

function getClientComponentLoaders(): ClientComponentLoaders | null {
  if (typeof window === "undefined") return null;
  return ((window as any).__LOLY_CLIENT_COMPONENT_LOADERS__ as ClientComponentLoaders) || null;
}

function normalizeClientFilePath(filePath: string): string {
  return filePath.replace(/\\/g, "/");
}

async function loadClientComponentModule(filePath: string): Promise<any> {
  const loaders = getClientComponentLoaders();
  if (!loaders) {
    throw new Error(
      `[client] Missing __LOLY_CLIENT_COMPONENT_LOADERS__. ` +
        `Expected bootstrap to register loaders from .loly/client-components-loaders.ts`
    );
  }

  const normalized = normalizeClientFilePath(filePath);
  const loader = loaders[normalized];
  if (!loader) {
    const known = Object.keys(loaders);
    throw new Error(
      `[client] No loader found for "${normalized}". ` +
        `Known loaders: ${known.slice(0, 10).join(", ")}${known.length > 10 ? "..." : ""}`
    );
  }

  return loader();
}

async function loadClientComponentExport(
  filePath: string,
  exportName: string = "default"
): Promise<any> {
  const mod = await loadClientComponentModule(filePath);
  return exportName === "default" ? mod.default : mod[exportName];
}

export async function mountClientIslands(container: HTMLElement): Promise<void> {
  // Find all placeholders that were rendered by the server
  // These divs exist in the DOM from server HTML but were never in React's hydration tree
  // React doesn't know about them, so we can safely mount into them with createRoot
  const placeholders = container.querySelectorAll('[data-client-component]');
  if (placeholders.length === 0) return;

  const promises = Array.from(placeholders).map(async (placeholder) => {
    const filePath = placeholder.getAttribute("data-client-file");
    const exportName = placeholder.getAttribute("data-export-name") || "default";
    const propsJson = placeholder.getAttribute("data-client-props");

    if (!filePath) {
      console.warn("[client] Missing filePath for component");
      return;
    }

    let props: Record<string, any> = {};
    if (propsJson) {
      try {
        props = JSON.parse(propsJson);
      } catch (e) {
        console.warn("[client] Failed to parse props", e);
      }
    }

    try {
      const Component = await loadClientComponentExport(filePath, exportName);
      if (!Component) throw new Error(`Component export "${exportName}" not found`);

      const placeholderElement = placeholder as HTMLElement;
      
      // Clear any existing content (should be empty, but be safe)
      // This ensures we start with a clean slate
      while (placeholderElement.firstChild) {
        placeholderElement.removeChild(placeholderElement.firstChild);
      }
      
      // Mount directly into the server-rendered placeholder element
      // createRoot creates a separate root that's independent of React's hydration root
      // Since React never hydrated this node (it was null in the React tree),
      // there's no conflict and no hydration error
      const root = createRoot(placeholderElement);
      root.render(React.createElement(Component, props));
    } catch (error) {
      console.error("[client] Failed to mount component:", error);
      const placeholderElement = placeholder as HTMLElement;
      while (placeholderElement.firstChild) {
        placeholderElement.removeChild(placeholderElement.firstChild);
      }
      const root = createRoot(placeholderElement);
      root.render(
        React.createElement(
          "div",
          { style: { padding: "1rem", border: "1px solid red", color: "red" } },
          "Failed to load component"
        )
      );
    }
  });

  await Promise.all(promises);
}
