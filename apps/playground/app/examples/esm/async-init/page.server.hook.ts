import type { ServerLoader } from "@lolyjs/core";
import { data, isInitialized } from "../../../lib/async-init";

/**
 * Async Module Initialization Example
 * 
 * Demonstrates how ESM modules can initialize themselves
 * asynchronously using top-level await.
 * 
 * ✅ This only works in ESM (not available in CommonJS)
 */

// The module is already initialized when imported
// No need to call any initialization function
export const getServerSideProps: ServerLoader = async () => {
  return {
    props: {
      data,
      isInitialized: isInitialized(),
      message: "Module was initialized with top-level await!",
      explanation:
        "The module @/lib/async-init.ts uses top-level await to initialize itself when imported. This means the data is ready immediately when you import the module, without needing to call an async initialization function.",
    },
    metadata: {
      title: "Async Module Initialization",
      description: "Demonstrating ESM async module initialization",
    },
  };
};

