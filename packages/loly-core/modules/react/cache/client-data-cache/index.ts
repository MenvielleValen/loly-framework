type RouteData = {
  ok: boolean;
  status: number;
  json: any;
};

type CacheEntry =
  | { status: "pending"; promise: Promise<RouteData> }
  | { status: "fulfilled"; value: RouteData }
  | { status: "rejected"; error: any };

const dataCache = new Map<string, CacheEntry>();

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

export function prefetchRouteData(url: string): void {
  const key = buildDataUrl(url);
  const cached = dataCache.get(key);

  if (cached && cached.status !== "rejected") return;

  const promise = fetchRouteDataOnce(url)
    .then((value) => {
      dataCache.set(key, { status: "fulfilled", value });
      return value;
    })
    .catch((error) => {
      console.error("[client][cache] Error prefetching route data:", error);
      dataCache.set(key, { status: "rejected", error });
      throw error;
    });

  dataCache.set(key, { status: "pending", promise });
}

export async function getRouteData(url: string): Promise<RouteData> {
  const key = buildDataUrl(url);
  const entry = dataCache.get(key);

  if (entry) {
    if (entry.status === "fulfilled") {
      return entry.value;
    }
    if (entry.status === "pending") {
      return entry.promise;
    }
  }

  const promise = fetchRouteDataOnce(url)
    .then((value) => {
      dataCache.set(key, { status: "fulfilled", value });
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
