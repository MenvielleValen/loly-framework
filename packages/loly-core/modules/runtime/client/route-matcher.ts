import type { ClientRouteLoaded, ClientRouteMatch } from "./types";

export function buildClientRegexFromPattern(pattern: string): RegExp {
  const segments = pattern.split("/").filter(Boolean);
  const regexParts: string[] = [];

  for (let i = 0; i < segments.length; i++) {
    const seg = segments[i];

    // catch-all [...slug]
    if (seg.startsWith("[...") && seg.endsWith("]")) {
      if (i !== segments.length - 1) {
        throw new Error(
          `Catch-all segment "${seg}" in "${pattern}" must be the last segment.`
        );
      }
      regexParts.push("(.+)");
      continue;
    }

    // dynamic [id]
    if (seg.startsWith("[") && seg.endsWith("]")) {
      regexParts.push("([^/]+)");
      continue;
    }

    // static segment
    const escaped = seg.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    regexParts.push(escaped);
  }

  const regexSource = "^/" + regexParts.join("/") + "/?$";
  return new RegExp(regexSource);
}

export function matchRouteClient(
  pathWithSearch: string,
  routes: ClientRouteLoaded[]
): ClientRouteMatch | null {
  const [pathname] = pathWithSearch.split("?");
  for (const r of routes) {
    const regex = buildClientRegexFromPattern(r.pattern);
    const match = regex.exec(pathname);
    if (!match) continue;

    const params: Record<string, string> = {};
    r.paramNames.forEach((name, idx) => {
      params[name] = decodeURIComponent(match[idx + 1] || "");
    });

    return { route: r, params };
  }
  return null;
}

