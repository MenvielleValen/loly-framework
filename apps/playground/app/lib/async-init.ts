/**
 * Async Module Initialization
 * 
 * This module demonstrates ESM's ability to initialize modules
 * asynchronously using top-level await.
 * 
 * ✅ This only works in ESM - Top-level await in modules
 */

let initialized = false;
let cache: any = null;

// Top-level await for initialization
const init = async () => {
  if (initialized) return cache;

  // Simulate expensive initialization (DB connection, config load, etc.)
  await new Promise((resolve) => setTimeout(resolve, 50));

  cache = {
    db: "connected",
    config: { env: process.env.NODE_ENV },
    timestamp: Date.now(),
    initialized: true,
  };

  initialized = true;
  return cache;
};

// The module is ready when imported
// This executes when the module is first loaded
export const data = await init();

export async function getData() {
  return data;
}

export function isInitialized() {
  return initialized;
}

