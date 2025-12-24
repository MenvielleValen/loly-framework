import type { ServerLoader } from "@lolyjs/core";

/**
 * Top-Level Await Example
 * 
 * This demonstrates ESM's ability to use await at the module level.
 * In CJS, you'd need to wrap everything in an async function.
 * 
 * ✅ This only works in ESM - Top-level await
 */

// Simulate async configuration loading
const loadConfig = async () => {
  // Simulate network/DB delay
  await new Promise((resolve) => setTimeout(resolve, 100));
  return {
    apiUrl: "https://api.example.com",
    features: ["feature1", "feature2", "top-level-await"],
    version: "1.0.0",
    loadedAt: new Date().toISOString(),
  };
};

// Top-level await - Does NOT work in CJS
// This executes when the module loads, not inside a function
const appConfig = await loadConfig();

export const getServerSideProps: ServerLoader = async () => {
  return {
    props: {
      config: appConfig,
      message: "This page uses top-level await! 🎉",
      timestamp: new Date().toISOString(),
      explanation: "The configuration above was loaded using 'await' at the module level, which is only possible in ESM. In CJS, you'd need to wrap everything in an async function.",
    },
    metadata: {
      title: "Top-Level Await Example",
      description: "Demonstrating ESM top-level await capability",
    },
  };
};

