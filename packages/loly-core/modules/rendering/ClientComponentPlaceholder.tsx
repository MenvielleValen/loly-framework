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
  
  /**
   * Export name for named exports (default: "default").
   */
  exportName?: string;
}

/**
 * Generates a deterministic ID from file path and export name.
 * This ensures stable IDs across server and client renders.
 */
export function generateStableId(filePath: string, exportName: string = "default"): string {
  const input = `${filePath}:${exportName}`;
  // Simple hash function for deterministic IDs (browser-compatible)
  let hash = 0;
  for (let i = 0; i < input.length; i++) {
    const char = input.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  // Convert to positive hex string
  const hexHash = Math.abs(hash).toString(36);
  return `client-island-${hexHash}`;
}

/**
 * Safely serializes props to JSON, excluding non-serializable values.
 * Filters out:
 * - Functions
 * - React components
 * - React elements (children)
 * - Objects with circular references
 * - Undefined values
 */
export function serializeProps(props: Record<string, any>): string {
  if (!props || typeof props !== "object") {
    return "{}";
  }

  const seen = new WeakSet();
  
  function isSerializable(value: any, depth: number = 0): boolean {
    // Prevent infinite recursion
    if (depth > 10) return false;
    
    // Handle null and primitives
    if (value === null || value === undefined) return true;
    if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") return true;
    
    // Functions are not serializable
    if (typeof value === "function") return false;
    
    // React components and elements are not serializable
    if (React.isValidElement(value)) return false;
    if (value && typeof value === "object" && value.$$typeof) return false; // React element marker
    
    // Check for circular references
    if (typeof value === "object") {
      if (seen.has(value)) return false;
      seen.add(value);
      
      try {
        // Check if it's an array
        if (Array.isArray(value)) {
          return value.every(item => isSerializable(item, depth + 1));
        }
        
        // Check object properties
        for (const key in value) {
          if (Object.prototype.hasOwnProperty.call(value, key)) {
            if (!isSerializable(value[key], depth + 1)) {
              seen.delete(value);
              return false;
            }
          }
        }
        
        seen.delete(value);
        return true;
      } catch {
        seen.delete(value);
        return false;
      }
    }
    
    return false;
  }
  
  function filterProps(obj: Record<string, any>): Record<string, any> {
    const filtered: Record<string, any> = {};
    
    for (const key in obj) {
      if (Object.prototype.hasOwnProperty.call(obj, key)) {
        const value = obj[key];
        
        // Skip children (React elements) - they will be passed separately during mounting
        if (key === "children") continue;
        
        // Skip functions
        if (typeof value === "function") continue;
        
        // Skip React elements and components
        if (React.isValidElement(value)) continue;
        if (value && typeof value === "object" && value.$$typeof) continue;
        
        // Try to serialize the value
        if (isSerializable(value)) {
          try {
            // Test if it can be stringified
            JSON.stringify(value);
            filtered[key] = value;
          } catch {
            // Skip if it can't be stringified
            continue;
          }
        }
      }
    }
    
    return filtered;
  }
  
  try {
    const filtered = filterProps(props);
    // Sort keys to ensure deterministic serialization
    // This ensures the same props always produce the same JSON string
    const sorted = Object.keys(filtered).sort().reduce((acc, key) => {
      acc[key] = filtered[key];
      return acc;
    }, {} as Record<string, any>);
    return JSON.stringify(sorted);
  } catch (error) {
    // If serialization fails, return empty object
    console.warn("[ClientComponentPlaceholder] Failed to serialize props:", error);
    return "{}";
  }
}

/**
 * Placeholder component rendered on the server for client components.
 * 
 * This component renders a placeholder div that will be mounted as an island
 * using createRoot after the main tree hydration completes.
 * 
 * The placeholder includes data attributes that allow the client
 * to identify and mount the correct component.
 */
export function ClientComponentPlaceholder({
  componentName,
  filePath,
  props,
  exportName = "default",
}: ClientComponentPlaceholderProps): React.ReactElement {
  // Generate deterministic ID based on filePath and exportName
  const stableId = filePath ? generateStableId(filePath, exportName) : `client-island-${componentName}`;
  
  // Serialize props deterministically
  const serializedProps = props ? serializeProps(props) : "{}";
  
  // Create an empty div with data attributes
  // suppressHydrationWarning tells React to ignore any content differences during hydration
  // The div should be completely empty - no children, no text content
  return React.createElement("div", {
    id: stableId,
    "data-client-component": componentName,
    "data-client-file": filePath || "",
    "data-client-props": serializedProps,
    "data-export-name": exportName,
    suppressHydrationWarning: true, // Critical: ignore markup differences during hydration
  }, null); // Explicitly set children to null to ensure empty content
}

/**
 * Escapes HTML special characters for use in HTML attributes.
 */
function escapeHtml(unsafe: string): string {
  return unsafe
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

/**
 * Generates placeholder HTML as a plain string (not React element).
 * This is used to inject placeholders outside of React's rendering pipeline.
 * 
 * @param componentName - Name of the component
 * @param filePath - Relative file path from project root
 * @param props - Props to serialize and pass to component
 * @param exportName - Export name (default: "default")
 * @returns HTML string for the placeholder div
 */
export function generatePlaceholderHTML(
  componentName: string,
  filePath: string,
  props: Record<string, any>,
  exportName: string = "default"
): string {
  const stableId = generateStableId(filePath, exportName);
  const serializedProps = serializeProps(props);
  
  // Escape HTML in attributes
  const escapedComponentName = escapeHtml(componentName);
  const escapedFilePath = escapeHtml(filePath);
  const escapedProps = escapeHtml(serializedProps);
  const escapedExportName = escapeHtml(exportName);
  
  return `<div id="${stableId}" data-client-component="${escapedComponentName}" data-client-file="${escapedFilePath}" data-client-props="${escapedProps}" data-export-name="${escapedExportName}"></div>`;
}
