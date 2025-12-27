import React from "react";

export interface ClientComponentPlaceholderProps {
  /**
   * Name or identifier of the client component.
   * Used for debugging and to identify the component during hydration.
   */
  componentName: string;
  
  /**
   * File path of the client component.
   * Used for debugging and to identify the component during hydration.
   */
  filePath?: string;
  
  /**
   * Optional props that will be passed to the component after hydration.
   * These are serialized and stored in the placeholder for later use.
   */
  props?: Record<string, any>;
}

/**
 * Placeholder component rendered on the server for client components.
 * 
 * This component renders a placeholder div that will be replaced
 * by the actual client component during hydration.
 * 
 * The placeholder includes data attributes that allow the client
 * to identify and hydrate the correct component.
 */
export function ClientComponentPlaceholder({
  componentName,
  filePath,
  props,
}: ClientComponentPlaceholderProps): React.ReactElement {
  // Create a unique ID for this placeholder instance
  const placeholderId = `client-component-${componentName}-${Math.random().toString(36).substr(2, 9)}`;
  
  return React.createElement("div", {
    "data-client-component": componentName,
    "data-client-file": filePath || "",
    "data-client-props": props ? JSON.stringify(props) : "{}",
    "data-placeholder-id": placeholderId,
    suppressHydrationWarning: true,
    style: {
      display: "contents", // Don't add extra DOM nodes, just mark the placeholder
    },
  });
}

