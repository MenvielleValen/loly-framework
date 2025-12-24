import type { ServerLoader } from "@lolyjs/core";

/**
 * Dynamic Imports Example
 * 
 * Demonstrates ESM's powerful dynamic import() capabilities.
 * ESM dynamic imports are more flexible and native than CJS require().
 * 
 * ✅ Works better in ESM than CommonJS
 */

export const getServerSideProps: ServerLoader = async () => {
  const features: Array<{ name: string; loaded: boolean; source?: string }> = [];

  // Load module dynamically (more flexible in ESM than CJS require())
  // Note: Completely dynamic template literals have limitations with bundlers
  // This example demonstrates dynamic imports that work correctly with bundlers
  try {
    const utils = await import("../../../lib/utils");
    features.push({
      name: "Utils (dynamic import)",
      loaded: !!utils.default || Object.keys(utils).length > 0,
      source: "Dynamic import (works with bundlers)",
    });
  } catch {
    features.push({
      name: "Utils (dynamic import)",
      loaded: false,
      source: "Module not found",
    });
  }

  // Load multiple modules in parallel (more efficient)
  const importResults = await Promise.allSettled([
    import("../../../lib/config").catch(() => ({ default: null })),
    import("../../../lib/helpers").catch(() => ({ default: null })),
  ]);

  const [configResult, helpersResult] = importResults;

  if (configResult.status === "fulfilled") {
    features.push({
      name: "Config",
      loaded: !!configResult.value.default || Object.keys(configResult.value).length > 0,
      source: "Parallel import",
    });
  }

  if (helpersResult.status === "fulfilled") {
    features.push({
      name: "Helpers",
      loaded: !!helpersResult.value.default || Object.keys(helpersResult.value).length > 0,
      source: "Parallel import",
    });
  }

  return {
    props: {
      features,
      message: "Dynamic imports work seamlessly in ESM!",
      explanation:
        "ESM's dynamic import() is more powerful than CJS require(). It supports template literals, conditional loading, parallel imports, and better error handling. All imports are asynchronous and return Promises.",
    },
    metadata: {
      title: "Dynamic Imports Example",
      description: "Demonstrating ESM dynamic import capabilities",
    },
  };
};

