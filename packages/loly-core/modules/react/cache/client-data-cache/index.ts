type RouteData = {
  ok: boolean;
  status: number;
  json: any;
};

type CacheEntry =
  | { status: "pending"; promise: Promise<RouteData> }
  | { status: "fulfilled"; value: RouteData }
  | { status: "rejected"; error: any };

// Use window to guarantee a single shared cache instance
// across all bundles/modules
const CACHE_KEY = "__FW_DATA_CACHE__";

// Maximum number of entries in the cache (LRU)
const MAX_CACHE_SIZE = 100;

type CacheStore = {
  data: Map<string, CacheEntry>;
  index: Map<string, Set<string>>; // pathBase -> Set of keys
  lru: string[]; // Ordered list: most recent at end, oldest at start
};

function getCacheStore(): CacheStore {
  if (typeof window !== "undefined") {
    if (!(window as any)[CACHE_KEY]) {
      (window as any)[CACHE_KEY] = {
        data: new Map<string, CacheEntry>(),
        index: new Map<string, Set<string>>(),
        lru: [],
      };
    }
    return (window as any)[CACHE_KEY];
  }
  // Fallback for SSR (though this shouldn't be used on the client)
  return {
    data: new Map<string, CacheEntry>(),
    index: new Map<string, Set<string>>(),
    lru: [],
  };
}

const cacheStore = getCacheStore();
const dataCache = cacheStore.data;
const pathIndex = cacheStore.index;
const lru = cacheStore.lru;

// Helper functions for cache management

/**
 * Extract base path from a cache key (removes query params)
 */
function extractPathBase(key: string): string {
  return key.split("?")[0];
}

/**
 * Add key to path index
 */
function addToIndex(key: string): void {
  const pathBase = extractPathBase(key);
  if (!pathIndex.has(pathBase)) {
    pathIndex.set(pathBase, new Set());
  }
  pathIndex.get(pathBase)!.add(key);
}

/**
 * Remove key from path index
 */
function removeFromIndex(key: string): void {
  const pathBase = extractPathBase(key);
  const keys = pathIndex.get(pathBase);
  if (keys) {
    keys.delete(key);
    if (keys.size === 0) {
      pathIndex.delete(pathBase);
    }
  }
}

/**
 * Update LRU order - move key to end (most recent)
 */
function updateLRU(key: string): void {
  const index = lru.indexOf(key);
  if (index !== -1) {
    lru.splice(index, 1);
  }
  lru.push(key);
}

/**
 * Remove oldest entries if cache exceeds MAX_CACHE_SIZE
 */
function evictOldest(): void {
  while (lru.length >= MAX_CACHE_SIZE && lru.length > 0) {
    const oldestKey = lru.shift()!;
    dataCache.delete(oldestKey);
    removeFromIndex(oldestKey);
  }
}

/**
 * Set cache entry and maintain indexes
 */
function setCacheEntry(key: string, entry: CacheEntry): void {
  const existingEntry = dataCache.get(key);
  const wasFulfilled = existingEntry?.status === "fulfilled";
  
  dataCache.set(key, entry);
  
  // Only track fulfilled entries in LRU and index (not pending/rejected)
  if (entry.status === "fulfilled") {
    // Add to index if it wasn't already fulfilled (new entry or transition from pending/rejected)
    if (!wasFulfilled) {
      addToIndex(key);
    }
    updateLRU(key);
    evictOldest();
  } else if (wasFulfilled) {
    // If entry was fulfilled and now isn't (transitioning to pending/rejected), remove from index
    removeFromIndex(key);
  }
}

/**
 * Delete cache entry and clean up indexes
 */
function deleteCacheEntry(key: string): void {
  if (dataCache.has(key)) {
    dataCache.delete(key);
    removeFromIndex(key);
    const lruIndex = lru.indexOf(key);
    if (lruIndex !== -1) {
      lru.splice(lruIndex, 1);
    }
  }
}

function buildDataUrl(url: string): string {
  return url + (url.includes("?") ? "&" : "?") + "__fw_data=1";
}

async function fetchRouteDataOnce(url: string): Promise<RouteData> {
  const dataUrl = buildDataUrl(url);

  const res = await fetch(dataUrl, {
    headers: {
      "x-fw-data": "1",
      Accept: "application/json",
    },
  });

  let json: any = {};

  try {
    const text = await res.text();
    if (text) {
      json = JSON.parse(text);
    }
  } catch (parseError) {
    console.error(
      "[client][cache] Failed to parse response as JSON:",
      parseError
    );
  }

  const result: RouteData = {
    ok: res.ok,
    status: res.status,
    json,
  };

  return result;
}

/**
 * Revalidates route data by removing it from the cache.
 * The next time you navigate to this route, fresh data will be fetched from the server.
 * This is a client-side function and does not require a server-side revalidation.
 *
 * @param path - The route path to revalidate (e.g., '/posts/1' or '/posts/1?page=2')
 *               If query params are not included, revalidates all variants of that route.
 *
 * @example
 * ```ts
 * // After saving something to the DB, revalidate the route
 * await saveToDatabase(data);
 * revalidatePath('/posts');
 * 
 * // Revalidate a specific route with query params
 * revalidatePath('/posts?page=2');
 * ```
 */
export function revalidatePath(path: string): void {
  // Normalize the base path (without query params)
  const normalizedPath = path.split("?")[0];
  const hasQueryParams = path.includes("?");
  
  // Get all keys for this path base from index (O(1) lookup)
  const keysForPath = pathIndex.get(normalizedPath);
  
  if (!keysForPath || keysForPath.size === 0) {
    return; // No entries to revalidate
  }
  
  // If the path includes specific query params, extract them
  let specificQueryParams: string | undefined;
  if (hasQueryParams) {
    const queryPart = path.split("?")[1];
    // Sort query params for consistent comparison
    specificQueryParams = queryPart
      .split("&")
      .filter((p) => !p.startsWith("__fw_data="))
      .sort()
      .join("&");
  }
  
  // Iterate only over keys for this path (much smaller set)
  const keysToDelete: string[] = [];
  for (const key of keysForPath) {
    // If specific query params were specified, check if they match
    if (hasQueryParams && specificQueryParams) {
      const [, keyQuery = ""] = key.split("?");
      const keyQueryParams = keyQuery
        .split("&")
        .filter((p) => !p.startsWith("__fw_data="))
        .sort()
        .join("&");
      
      if (keyQueryParams === specificQueryParams) {
        keysToDelete.push(key);
      }
    } else {
      // If no specific query params, revalidate all variants
      keysToDelete.push(key);
    }
  }
  
  // Delete matching entries
  keysToDelete.forEach((key) => {
    deleteCacheEntry(key);
  });
}

/**
 * @deprecated Use `revalidatePath()` instead. This function is kept for backwards compatibility.
 */
export function revalidateRouteData(url: string): void {
  revalidatePath(url);
}

export function prefetchRouteData(url: string): void {
  const key = buildDataUrl(url);

  const cached = dataCache.get(key);

  if (cached && cached.status !== "rejected") {
    // Update LRU if it exists and is fulfilled
    if (cached.status === "fulfilled") {
      updateLRU(key);
    }
    return;
  }

  const promise = fetchRouteDataOnce(url)
    .then((value) => {
      setCacheEntry(key, { status: "fulfilled", value });
      return value;
    })
    .catch((error) => {
      console.error("[client][cache] Error prefetching route data:", error);
      dataCache.set(key, { status: "rejected", error });
      throw error;
    });

  dataCache.set(key, { status: "pending", promise });
}

export type GetRouteDataOptions = {
  /**
   * If true, forces revalidation of route data,
   * ignoring the cache and fetching fresh data from the server.
   * Similar to Next.js's `router.refresh()` behavior.
   */
  revalidate?: boolean;
};

export async function getRouteData(
  url: string,
  options?: GetRouteDataOptions
): Promise<RouteData> {
  const key = buildDataUrl(url);

  // If revalidation is requested, remove the entry from cache
  if (options?.revalidate) {
    deleteCacheEntry(key);
  }

  const entry = dataCache.get(key);

  if (entry) {
    if (entry.status === "fulfilled") {
      // Update LRU: mark as recently used
      updateLRU(key);
      return entry.value;
    }
    if (entry.status === "pending") {
      return entry.promise;
    }
  }

  // No entry in cache, fetch it
  const promise = fetchRouteDataOnce(url)
    .then((value) => {
      setCacheEntry(key, { status: "fulfilled", value });
      return value;
    })
    .catch((error) => {
      console.error("[client][cache] Error fetching route data:", error);
      dataCache.set(key, { status: "rejected", error });
      throw error;
    });

  dataCache.set(key, { status: "pending", promise });
  return promise;
}
