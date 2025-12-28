import fs from "fs";
import path from "path";

/**
 * Checks if a file is a client component based on its filename.
 * Client components use the convention: *.client.tsx, *.client.ts, *.client.jsx, *.client.js
 * 
 * Pages and layouts CANNOT be client components - they must always be server components.
 * 
 * @param filePath - Path to the file to check
 * @returns `true` if the file is a client component, `false` otherwise
 */
export function isClientComponentFile(filePath: string): boolean {
  if (!filePath) {
    return false;
  }

  const normalizedPath = path.normalize(filePath);
  const fileName = path.basename(normalizedPath);
  
  // Check if file matches client component pattern: *.client.tsx, *.client.ts, *.client.jsx, *.client.js
  const clientComponentPattern = /\.client\.(tsx|ts|jsx|js)$/i;
  if (!clientComponentPattern.test(fileName)) {
    return false;
  }
  
  // Pages and layouts are ALWAYS server components, even if they have .client. in the name
  // This prevents accidental client pages/layouts
  if (fileName === "page.client.tsx" || 
      fileName === "page.client.ts" || 
      fileName === "page.client.jsx" || 
      fileName === "page.client.js" ||
      fileName === "layout.client.tsx" || 
      fileName === "layout.client.ts" || 
      fileName === "layout.client.jsx" || 
      fileName === "layout.client.js") {
    return false;
  }
  
  return true;
}

/**
 * Registry of client component file paths.
 * Used to track which components should not be rendered on the server.
 */
const clientComponentRegistry = new Set<string>();

/**
 * Registers a file as a client component.
 * 
 * @param filePath - Absolute or relative path to the component file
 */
export function registerClientComponent(filePath: string): void {
  const normalizedPath = path.normalize(filePath);
  clientComponentRegistry.add(normalizedPath);
}

/**
 * Checks if a file is registered as a client component.
 * 
 * @param filePath - Absolute or relative path to the component file
 * @returns `true` if the file is registered as a client component
 */
export function isClientComponent(filePath: string): boolean {
  const normalizedPath = path.normalize(filePath);
  return clientComponentRegistry.has(normalizedPath);
}

/**
 * Scans a directory and registers all client component files.
 * Client components are identified by the .client.tsx/.client.ts/.client.jsx/.client.js extension.
 * 
 * @param dirPath - Directory to scan
 * @param extensions - File extensions to check (default: [".tsx", ".ts", ".jsx", ".js"])
 */
export function scanAndRegisterClientComponents(
  dirPath: string,
  extensions: string[] = [".tsx", ".ts", ".jsx", ".js"]
): void {
  if (!fs.existsSync(dirPath)) {
    return;
  }

  function walk(currentDir: string): void {
    const entries = fs.readdirSync(currentDir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(currentDir, entry.name);

      if (entry.isDirectory()) {
        // Skip node_modules and build directories
        if (entry.name === "node_modules" || entry.name === ".loly" || entry.name.startsWith(".")) {
          continue;
        }
        walk(fullPath);
      } else if (entry.isFile()) {
        const ext = path.extname(entry.name);
        if (extensions.includes(ext)) {
          // Use filename-based detection instead of reading file content
          if (isClientComponentFile(fullPath)) {
            registerClientComponent(fullPath);
          }
        }
      }
    }
  }

  walk(dirPath);
}

/**
 * Gets all registered client component paths.
 * 
 * @returns Array of registered client component file paths
 */
export function getClientComponents(): string[] {
  return Array.from(clientComponentRegistry);
}

/**
 * Clears the client component registry.
 * Useful for testing or when rebuilding.
 */
export function clearClientComponentRegistry(): void {
  clientComponentRegistry.clear();
}

