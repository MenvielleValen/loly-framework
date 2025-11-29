import { useEffect, useState } from "react";
import { hydrateRoot } from "react-dom/client";

// Client-side constants (hardcoded to avoid alias resolution issues in Rspack)
const WINDOW_DATA_KEY = "__FW_DATA__";
const APP_CONTAINER_ID = "__app";

type InitialData = {
  pathname: string;
  params: Record<string, string>;
  props: Record<string, any>;
  metadata?: { title?: string; description?: string } | null;
  notFound?: boolean;
  error?: boolean;
  theme?: string;
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

export type ClientRouteMatch = {
  route: ClientRouteLoaded;
  params: Record<string, string>;
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

function matchRouteClient(
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
    // Don't show 404 if we're waiting for components to load
    if (state.components === null) {
      return null;
    }
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

function AppShell({
  initialState,
  routes,
  notFoundRoute,
  errorRoute,
}: AppShellProps) {
  const [state, setState] = useState<RouteViewState>(initialState);

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

        let json: any = {};
        try {
          const text = await res.text();
          if (text) {
            json = JSON.parse(text);
          }
        } catch (parseError) {
          // Si falla el parseo y además no es OK, hacemos fallback a full reload
          if (!res.ok) {
            console.error(
              "[client] Failed to parse response as JSON:",
              parseError
            );
            window.location.href = nextUrl;
            return;
          }
        }

        // Manejo de error explícito en payload
        if (json && json.error) {
          console.log("[client] Error detected in response:", json);

          if (errorRoute) {
            try {
              const components = await errorRoute.load();

              // Marcamos flags en window para mantener estado consistente
              (window as any)[WINDOW_DATA_KEY] = {
                pathname: nextUrl,
                params: json.params || {},
                props: json.props || {
                  error: json.message || "An error occurred",
                },
                metadata: json.metadata ?? null,
                theme:
                  json.theme ??
                  (window as any)[WINDOW_DATA_KEY]?.theme ??
                  null,
                notFound: false,
                error: true,
              };

              setState({
                url: nextUrl,
                route: errorRoute,
                params: json.params || {},
                components,
                props:
                  json.props || {
                    error: json.message || "An error occurred",
                  },
              });
              return;
            } catch (loadError) {
              console.error(
                "[client] Error loading error route components:",
                loadError
              );
              window.location.href = nextUrl;
              return;
            }
          } else {
            console.warn(
              "[client] Error route not available, reloading page.",
              errorRoute
            );
            window.location.href = nextUrl;
            return;
          }
        }

        // Manejo de respuestas no-OK sin error payload explícito
        if (!res.ok) {
          if (json && (json as any).redirect) {
            window.location.href = (json as any).redirect.destination;
            return;
          }
          window.location.href = nextUrl;
          return;
        }

        // Redirección vía JSON
        if (json.redirect) {
          window.location.href = json.redirect.destination;
          return;
        }

        // Manejo de notFound
        if (json.notFound) {
          // Actualizamos flags globales
          (window as any)[WINDOW_DATA_KEY] = {
            pathname: nextUrl,
            params: {},
            props: json.props ?? {},
            metadata: json.metadata ?? null,
            theme:
              json.theme ?? (window as any)[WINDOW_DATA_KEY]?.theme ?? null,
            notFound: true,
            error: false,
          };

          if (notFoundRoute) {
            const components = await notFoundRoute.load();
            setState({
              url: nextUrl,
              route: notFoundRoute,
              params: {},
              components,
              props: json.props ?? {},
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

        // Ruta normal
        applyMetadata(json.metadata ?? null);
        const newProps = json.props ?? {};

        const matched = matchRouteClient(nextUrl, routes);

        if (!matched) {
          // No tenemos definición de ruta en el cliente → fallback a full reload
          window.location.href = nextUrl;
          return;
        }

        // Limpiamos flags globales de error/notFound
        (window as any)[WINDOW_DATA_KEY] = {
          pathname: nextUrl,
          params: matched.params,
          props: newProps,
          metadata: json.metadata ?? null,
          theme:
            json.theme ?? (window as any)[WINDOW_DATA_KEY]?.theme ?? null,
          notFound: false,
          error: false,
        };

        const components = await matched.route.load();

        window.scrollTo({
          top: 0,
          behavior: "smooth",
        });

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
  }, [routes, notFoundRoute, errorRoute]);

  const isError = state.route === errorRoute;
  const isNotFound = state.route === notFoundRoute;
  const routeType = isError ? "error" : isNotFound ? "notfound" : "normal";
  const routeKey = `${state.url}:${routeType}`;

  return <RouterView key={routeKey} state={state} />;
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
    const initialData: InitialData | null =
      ((window as any)[WINDOW_DATA_KEY] as InitialData | undefined) ?? null;

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

    try {
      if (isInitialError && errorRoute) {
        initialRoute = errorRoute;
        initialParams = initialData?.params ?? {};
        initialComponents = await errorRoute.load();
      } else if (isInitialNotFound && notFoundRoute) {
        initialRoute = notFoundRoute;
        initialParams = {};
        initialComponents = await notFoundRoute.load();
      } else {
        // Ruta "normal"
        const match = matchRouteClient(initialUrl, routes);
        if (match) {
          initialRoute = match.route;
          initialParams = match.params;
          initialComponents = await match.route.load();
        } else if (notFoundRoute) {
          // Si no matchea ninguna pero tenemos notFoundRoute, arrancamos en 404
          initialRoute = notFoundRoute;
          initialParams = {};
          initialComponents = await notFoundRoute.load();
        } else {
          console.warn(
            `[client] No route match found for ${initialUrl}. Available routes:`,
            routes.map((r) => r.pattern)
          );
        }
      }
    } catch (error) {
      console.error(
        "[client] Error loading initial route components for",
        initialUrl,
        error
      );
      // Fallback fuerte: recargar
      window.location.reload();
      return;
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
