import type { RspackPluginInstance } from "@rspack/core";
import path from "path";
import { isClientComponentFile, getClientComponents } from "../utils/detect-client-components";

/**
 * Creates a Rspack plugin that marks client components for code splitting.
 * 
 * This plugin:
 * 1. Detects modules following the *.client.* convention
 * 2. Marks them with metadata for downstream consumers
 * 3. Allows splitChunks to use this metadata to create separate chunks
 * 
 * @param projectRoot - Root directory of the project
 * @returns Rspack plugin instance
 */
export function createClientComponentsSplitterPlugin(
  projectRoot: string
): RspackPluginInstance {
  // Get the set of client components from the global registry
  // This is populated during route loading (loadRoutes) and build (scanAndRegisterClientComponents)
  const registeredComponents = getClientComponents();
  const clientComponents = new Set(
    registeredComponents.map(p => path.normalize(p).replace(/\\/g, "/"))
  );
  
  // Normalize paths for comparison
  const normalizePath = (p: string) => path.normalize(p).replace(/\\/g, "/");
  
  return {
    name: "client-components-splitter",
    apply(compiler) {
      compiler.hooks.normalModuleFactory.tap(
        "client-components-splitter",
        (normalModuleFactory) => {
          // Hook into module creation to mark client components
          normalModuleFactory.hooks.beforeResolve.tap(
            "client-components-splitter",
            (data) => {
              if (!data.request) return;
              
              // Skip node_modules
              if (data.request.includes("node_modules")) return;
              
              // Try to resolve the path
              let resolvedPath: string | null = null;
              
              // Handle relative paths
              if (data.request.startsWith(".")) {
                if (data.context) {
                  resolvedPath = path.resolve(data.context, data.request);
                }
              }
              // Handle absolute paths
              else if (path.isAbsolute(data.request)) {
                resolvedPath = data.request;
              }
              // Handle path aliases (we'll check these during module creation)
              else {
                // Path aliases will be resolved later, we'll check in afterResolve
                return;
              }
              
              if (resolvedPath) {
                const normalized = normalizePath(resolvedPath);
                // Check if it's a client component
                if (isClientComponentFile(resolvedPath)) {
                  clientComponents.add(normalized);
                }
              }
            }
          );
          
          // Also check after resolution (for path aliases)
          normalModuleFactory.hooks.afterResolve.tap(
            "client-components-splitter",
            (data) => {
              if (!data.resource) return;
              
              // Skip node_modules
              if (data.resource.includes("node_modules")) return;
              
              const normalized = normalizePath(data.resource);
              
              // Check if it's a client component
              if (isClientComponentFile(data.resource)) {
                clientComponents.add(normalized);
                // Mark the module with metadata
                if (!data.buildInfo) {
                  data.buildInfo = {};
                }
                data.buildInfo.isClientComponent = true;
                data.buildInfo.clientComponentPath = normalized;
              }
            }
          );
        }
      );
      
      // Make client components available to splitChunks via compiler
      compiler.hooks.thisCompilation.tap("client-components-splitter", (compilation) => {
        // Store client components in compilation for splitChunks to access
        (compilation as any).__clientComponents = clientComponents;
      });
    },
  };
}

/**
 * Checks if a module is a client component.
 * This can be used in splitChunks test function.
 * 
 * @param module - Rspack module
 * @param clientComponents - Set of normalized client component paths
 * @returns true if the module is a client component
 */
export function isClientComponentModule(
  module: any,
  clientComponents: Set<string>
): boolean {
  if (!module.resource) return false;
  
  const normalized = path.normalize(module.resource).replace(/\\/g, "/");
  
  // Check if it's in the registry
  if (clientComponents.has(normalized)) {
    return true;
  }
  
  // Check buildInfo metadata
  if (module.buildInfo?.isClientComponent) {
    return true;
  }
  
  // Fallback: check file directly
  try {
    return isClientComponentFile(module.resource);
  } catch {
    return false;
  }
}

