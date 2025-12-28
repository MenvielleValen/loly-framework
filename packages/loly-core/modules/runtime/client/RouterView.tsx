import React from "react";
import type { RouteViewState } from "./types";

export function RouterView({ state }: { state: RouteViewState }) {
  if (!state.route) {
    // Don't show 404 if we're waiting for components to load
    if (state.components === null) {
      return null;
    }
    return <h1>404 - Route not found</h1>;
  }

  if (!state.components) {
    return null;
  }

  const { 
    Page, 
    layouts, 
    isPageClientComponent, 
    isLayoutClientComponent, 
    clientComponentFilePaths 
  } = state.components;
  const { params, props } = state;

  // For client components, render null during hydration.
  // The placeholder divs already exist in the DOM from server HTML.
  // React will see null in the tree and won't try to hydrate or remove the placeholder.
  // After hydration completes, mountClientIslands will find the placeholders via
  // querySelector and mount components into them using createRoot.
  // This is the islands architecture pattern (Next.js, Astro, Marko).
  let element = isPageClientComponent && clientComponentFilePaths?.page
    ? null  // React never hydrates this - placeholder exists in DOM from server
    : React.createElement(Page, { params, ...props });

  const layoutChain = layouts.slice().reverse();
  const isLayoutClientComponentReversed = (isLayoutClientComponent || []).slice().reverse();
  const clientComponentLayoutPaths = (clientComponentFilePaths?.layouts || []).slice().reverse();
  
  for (let i = 0; i < layoutChain.length; i++) {
    const Layout = layoutChain[i];
    const isClient = isLayoutClientComponentReversed[i];
    const layoutPath = clientComponentLayoutPaths[i];
    
    element = isClient && layoutPath
      ? element  // Keep existing element (null or previous) - placeholder exists in DOM from server
      : React.createElement(Layout, { params, ...props, children: element });
  }

  return element;
}

