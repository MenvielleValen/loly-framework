import path from "path";

/**
 * Normalizes a client component file path to a stable chunk name identifier.
 * 
 * Rules:
 * - Removes .client.tsx/.client.ts/.client.jsx/.client.js extension (complete, not just final extension)
 * - Converts to relative path from project root
 * - Normalizes path separators
 * - Creates safe chunk name with consistent format
 * 
 * @param componentPath - Absolute or relative path to the client component
 * @param projectRoot - Root directory of the project
 * @returns Normalized chunk name without "client-component-" prefix
 * 
 * @example
 * normalizeClientComponentId(
 *   "/project/components/examples/LocalStorageCounter.client.tsx",
 *   "/project"
 * ) // Returns: "components-examples-localstoragecounter"
 */
export function normalizeClientComponentId(
  componentPath: string,
  projectRoot: string
): string {
  // Normalize path separators first
  let normalized = componentPath.replace(/\\/g, '/');
  
  // Calculate relative path from project root
  let relativePath = normalized;
  try {
    const relative = path.relative(projectRoot, normalized);
    if (relative && !relative.startsWith('..')) {
      relativePath = relative.replace(/\\/g, '/');
    }
  } catch {
    // Keep original if relative calculation fails
  }
  
  // Remove .client.tsx, .client.ts, .client.jsx, .client.js extensions (complete removal)
  // This is critical: .client is NOT part of the component identity
  const withoutClientExt = relativePath
    .replace(/\.client\.(tsx|ts|jsx|js)$/i, '')  // Remove .client.tsx etc
    .replace(/\.(tsx|ts|jsx|js)$/i, '');        // Fallback: remove regular extensions
  
  // Create safe name: replace non-alphanumeric with -, then slashes with -
  const safeName = withoutClientExt
    .replace(/[^a-zA-Z0-9/]/g, '-')  // Replace special chars with -
    .replace(/\//g, '-')              // Replace slashes with -
    .toLowerCase();
  
  return safeName;
}

/**
 * Normalizes a relative client component path to a chunk name identifier.
 * This version works with paths that are already relative (used in runtime).
 * 
 * @param relativePath - Relative path to the client component (e.g., "components/examples/LocalStorageCounter.client.tsx")
 * @returns Normalized chunk name without "client-component-" prefix
 * 
 * @example
 * normalizeClientComponentIdFromRelative(
 *   "components/examples/LocalStorageCounter.client.tsx"
 * ) // Returns: "components-examples-localstoragecounter"
 */
export function normalizeClientComponentIdFromRelative(relativePath: string): string {
  // Remove .client.tsx, .client.ts, .client.jsx, .client.js extensions (complete removal)
  const withoutClientExt = relativePath
    .replace(/\.client\.(tsx|ts|jsx|js)$/i, '')  // Remove .client.tsx etc
    .replace(/\.(tsx|ts|jsx|js)$/i, '');        // Fallback: remove regular extensions
  
  // Create safe name: replace non-alphanumeric with -, then slashes with -
  return withoutClientExt
    .replace(/[^a-zA-Z0-9/]/g, '-')  // Replace special chars with -
    .replace(/\//g, '-')              // Replace slashes with -
    .toLowerCase();
}

/**
 * Generates the full chunk name for a client component.
 * 
 * @param componentPath - Absolute or relative path to the client component
 * @param projectRoot - Root directory of the project
 * @returns Full chunk name including "client-component-" prefix
 * 
 * @example
 * getChunkNameForComponent(
 *   "/project/components/examples/LocalStorageCounter.client.tsx",
 *   "/project"
 * ) // Returns: "client-component-components-examples-localstoragecounter"
 */
export function getChunkNameForComponent(
  componentPath: string,
  projectRoot: string
): string {
  const id = normalizeClientComponentId(componentPath, projectRoot);
  return `client-component-${id}`;
}

/**
 * Generates the full chunk name for a client component from a relative path.
 * 
 * @param relativePath - Relative path to the client component (e.g., "components/examples/LocalStorageCounter.client.tsx")
 * @returns Full chunk name including "client-component-" prefix
 * 
 * @example
 * getChunkNameForComponentFromRelative(
 *   "components/examples/LocalStorageCounter.client.tsx"
 * ) // Returns: "client-component-components-examples-localstoragecounter"
 */
export function getChunkNameForComponentFromRelative(relativePath: string): string {
  const id = normalizeClientComponentIdFromRelative(relativePath);
  return `client-component-${id}`;
}

