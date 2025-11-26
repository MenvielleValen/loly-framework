import { useEffect, useState } from "react";
import { hydrateRoot } from "react-dom/client";

// Client-side constants (hardcoded to avoid alias resolution issues in Rspack)
const WINDOW_DATA_KEY = '__FW_DATA__';
const APP_CONTAINER_ID = '__app';

type InitialData = {
  pathname: string;
  params: Record<string, string>;
  props: Record<string, any>;
  metadata?: { title?: string; description?: string } | null;
  notFound?: boolean;
  error?: boolean;
};

declare global {
  interface Window {
    [WINDOW_DATA_KEY]?: InitialData;
  }
}

export type ClientLoadedComponents = {
  Page: React.ComponentType<any>;
  layouts: React.ComponentType<any>[];
};

export type ClientRouteLoaded = {
  pattern: string;
  paramNames: string[];
  load: () => Promise<ClientLoadedComponents>;
};

function buildClientRegexFromPattern(pattern: string): RegExp {
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

    if (seg.startsWith("[") && seg.endsWith("]")) {
      regexParts.push("([^/]+)");
      continue;
    }

    const escaped = seg.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    regexParts.push(escaped);
  }

  const regexSource = "^/" + regexParts.join("/") + "/?$";
  return new RegExp(regexSource);
}

function matchRouteClient(
  pathWithSearch: string,
  routes: ClientRouteLoaded[]
): { route: ClientRouteLoaded; params: Record<string, string> } | null {
  const [pathname] = pathWithSearch.split("?");
  for (const r of routes) {
    const regex = buildClientRegexFromPattern(r.pattern);
    const match = regex.exec(pathname);
    if (!match) continue;

    const params: Record<string, string> = {};
    r.paramNames.forEach((name, idx) => {
      params[name] = match[idx + 1];
    });

    return { route: r, params };
  }
  return null;
}

function applyMetadata(md?: { title?: string; description?: string } | null) {
  if (!md) return;

  if (md.title) {
    document.title = md.title;
  }

  if (md.description) {
    let meta = document.querySelector(
      'meta[name="description"]'
    ) as HTMLMetaElement | null;

    if (!meta) {
      meta = document.createElement("meta");
      meta.name = "description";
      document.head.appendChild(meta);
    }

    meta.content = md.description;
  }
}

type RouteViewState = {
  url: string;
  route: ClientRouteLoaded | null;
  params: Record<string, string>;
  components: ClientLoadedComponents | null;
  props: Record<string, any>;
};

function RouterView({ state }: { state: RouteViewState }) {
  if (!state.route) {
    return <h1>404 - Route not found</h1>;
  }

  if (!state.components) {
    return null;
  }

  const { Page, layouts } = state.components;
  const { params, props } = state;

  let element = <Page params={params} {...props} />;

  const layoutChain = layouts.slice().reverse();
  for (const Layout of layoutChain) {
    element = (
      <Layout params={params} {...props}>
        {element}
      </Layout>
    );
  }

  return element;
}

interface AppShellProps {
  initialState: RouteViewState;
  routes: ClientRouteLoaded[];
  notFoundRoute: ClientRouteLoaded | null;
  errorRoute: ClientRouteLoaded | null;
}

function AppShell({ initialState, routes, notFoundRoute, errorRoute }: AppShellProps) {
  // Check if initial state indicates an error
  const initialData = (window as any)[WINDOW_DATA_KEY] as any;
  const hasError = initialData?.error === true;
  
  // If error, use error route instead
  const effectiveInitialState = hasError && errorRoute
    ? {
        url: initialState.url,
        route: errorRoute,
        params: initialState.params,
        components: null,
        props: initialState.props,
      }
    : initialState;

  const [state, setState] = useState<RouteViewState>(effectiveInitialState);
  
  // Load error route components if needed
  useEffect(() => {
    if (hasError && errorRoute && !state.components) {
      errorRoute.load().then((components) => {
        setState((prev) => ({ ...prev, components }));
      });
    }
  }, [hasError, errorRoute, state.components]);

  useEffect(() => {
    async function navigate(nextUrl: string) {
      try {
        const res = await fetch(
          nextUrl + (nextUrl.includes("?") ? "&" : "?") + "__fw_data=1",
          {
            headers: {
              "x-fw-data": "1",
              Accept: "application/json",
            },
          }
        );

        if (!res.ok) {
          const json = await res.json().catch(() => ({} as any));
          if (json && (json as any).redirect) {
            window.location.href = (json as any).redirect.destination;
            return;
          }
          window.location.href = nextUrl;
          return;
        }

        const json = await res.json();

        if (json.error) {
          if (errorRoute) {
            const components = await errorRoute.load();
            setState({
              url: nextUrl,
              route: errorRoute,
              params: json.params || {},
              components,
              props: json.props || { error: json.message || "An error occurred" },
            });
          } else {
            window.location.href = nextUrl;
          }
          return;
        }

        if (json.redirect) {
          window.location.href = json.redirect.destination;
          return;
        }

        if (json.notFound) {
          if (notFoundRoute) {
            const components = await notFoundRoute.load();
            setState({
              url: nextUrl,
              route: notFoundRoute,
              params: {},
              components,
              props: {},
            });
          } else {
            setState({
              url: nextUrl,
              route: null,
              params: {},
              components: null,
              props: {},
            });
          }
          return;
        }

        applyMetadata(json.metadata ?? null);

        const newProps = json.props ?? {};

        const matched = matchRouteClient(nextUrl, routes);

        if (!matched) {
          window.location.href = nextUrl;
          return;
        }

        (window as any)[WINDOW_DATA_KEY] = {
          pathname: nextUrl,
          params: matched.params,
          props: newProps,
          metadata: json.metadata ?? null,
        };

        const components = await matched.route.load();

        setState({
          url: nextUrl,
          route: matched.route,
          params: matched.params,
          components,
          props: newProps,
        });
      } catch (err) {
        console.error("[client] Error fetching FW data:", err);
        window.location.href = nextUrl;
      }
    }

    function handleClick(ev: MouseEvent) {
      if (ev.defaultPrevented) return;
      if (ev.button !== 0) return;
      if (ev.metaKey || ev.ctrlKey || ev.shiftKey || ev.altKey) return;

      const target = ev.target as HTMLElement | null;
      if (!target) return;

      const anchor = target.closest("a[href]") as HTMLAnchorElement | null;
      if (!anchor) return;

      const href = anchor.getAttribute("href");
      if (!href) return;
      if (href.startsWith("#")) return;

      const url = new URL(href, window.location.href);
      if (url.origin !== window.location.origin) return;
      if (anchor.target && anchor.target !== "_self") return;

      ev.preventDefault();

      const nextUrl = url.pathname + url.search;
      const currentUrl = window.location.pathname + window.location.search;
      if (nextUrl === currentUrl) return;

      window.history.pushState({}, "", nextUrl);
      navigate(nextUrl);
    }

    function handlePopState() {
      const nextUrl = window.location.pathname + window.location.search;
      navigate(nextUrl);
    }

    window.addEventListener("click", handleClick);
    window.addEventListener("popstate", handlePopState);

    return () => {
      window.removeEventListener("click", handleClick);
      window.removeEventListener("popstate", handlePopState);
    };
  }, [routes, notFoundRoute]);

  return <RouterView state={state} />;
}

/**
 * Bootstraps the client-side application.
 *
 * @param routes - Array of client routes
 * @param notFoundRoute - Not-found route definition
 * @param errorRoute - Error route definition
 */
export function bootstrapClient(
  routes: ClientRouteLoaded[],
  notFoundRoute: ClientRouteLoaded | null,
  errorRoute: ClientRouteLoaded | null = null
) {

  (async function bootstrap() {
    const container = document.getElementById(APP_CONTAINER_ID);
    const initialData: InitialData | null = (window as any)[WINDOW_DATA_KEY] ?? null;

    if (!container) {
      console.error(`Container #${APP_CONTAINER_ID} not found for hydration`);
      return;
    }

    const initialUrl = window.location.pathname + window.location.search;
    const isInitialNotFound = initialData?.notFound === true;
    const isInitialError = initialData?.error === true;

    let initialRoute: ClientRouteLoaded | null = null;
    let initialParams: Record<string, string> = {};
    let initialComponents: ClientLoadedComponents | null = null;

    if (isInitialError && errorRoute) {
      // If error, use error route
      initialRoute = errorRoute;
      initialParams = initialData?.params ?? {};
      initialComponents = await errorRoute.load();
    } else if (isInitialNotFound && notFoundRoute) {
      // If not found, use not-found route
      initialRoute = notFoundRoute;
      initialParams = {};
      initialComponents = await notFoundRoute.load();
    } else if (!isInitialNotFound && !isInitialError) {
      // Normal route
      const match = matchRouteClient(initialUrl, routes);
      if (match) {
        initialRoute = match.route;
        initialParams = match.params;
        initialComponents = await match.route.load();
      }
    }

    if (initialData?.metadata) {
      applyMetadata(initialData.metadata);
    }

    const initialState: RouteViewState = {
      url: initialUrl,
      route: initialRoute,
      params: initialParams,
      components: initialComponents,
      props: initialData?.props ?? {},
    };

    hydrateRoot(
      container,
      <AppShell
        initialState={initialState}
        routes={routes}
        notFoundRoute={notFoundRoute}
        errorRoute={errorRoute}
      />
    );
  })();
}
