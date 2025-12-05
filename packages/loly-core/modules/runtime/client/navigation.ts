import { getRouteData } from "../../react/cache/index";
import { matchRouteClient } from "./route-matcher";
import { applyMetadata } from "./metadata";
import { setWindowData, getCurrentTheme } from "./window-data";
import type {
  ClientRouteLoaded,
  RouteViewState,
  InitialData,
} from "./types";

export type NavigationHandlers = {
  setState: (state: RouteViewState) => void;
  routes: ClientRouteLoaded[];
  notFoundRoute: ClientRouteLoaded | null;
  errorRoute: ClientRouteLoaded | null;
};

async function handleErrorRoute(
  nextUrl: string,
  json: any,
  errorRoute: ClientRouteLoaded,
  setState: (state: RouteViewState) => void
): Promise<boolean> {
  try {
    const components = await errorRoute.load();
    
    // Get theme: prioritize cookie, then server, then window data, then default
    let theme: string = "light";
    if (typeof document !== "undefined") {
      const cookieMatch = document.cookie.match(/theme=([^;]+)/);
      if (cookieMatch) {
        theme = cookieMatch[1];
      } else if (json.theme) {
        theme = json.theme;
      } else {
        const currentTheme = getCurrentTheme();
        if (currentTheme) theme = currentTheme;
      }
    } else if (json.theme) {
      theme = json.theme;
    }
    
    const errorProps = {
      ...(json.props || {
        error: json.message || "An error occurred",
      }),
      theme,
    };

    const windowData: InitialData = {
      pathname: nextUrl,
      params: json.params || {},
      props: errorProps,
      metadata: json.metadata ?? null,
      theme,
      notFound: false,
      error: true,
    };

    setWindowData(windowData);

    setState({
      url: nextUrl,
      route: errorRoute,
      params: json.params || {},
      components,
      props: errorProps,
    });
    return true;
  } catch (loadError) {
    console.error(
      "[client] Error loading error route components:",
      loadError
    );
    window.location.href = nextUrl;
    return false;
  }
}

async function handleNotFoundRoute(
  nextUrl: string,
  json: any,
  notFoundRoute: ClientRouteLoaded | null,
  setState: (state: RouteViewState) => void
): Promise<void> {
  // Get theme: prioritize cookie, then server, then window data, then default
  let theme: string = "light";
  if (typeof document !== "undefined") {
    const cookieMatch = document.cookie.match(/theme=([^;]+)/);
    if (cookieMatch) {
      theme = cookieMatch[1];
    } else if (json.theme) {
      theme = json.theme;
    } else {
      const currentTheme = getCurrentTheme();
      if (currentTheme) theme = currentTheme;
    }
  } else if (json.theme) {
    theme = json.theme;
  }
  
  const notFoundProps = {
    ...(json.props ?? {}),
    theme,
  };

  const windowData: InitialData = {
    pathname: nextUrl,
    params: {},
    props: notFoundProps,
    metadata: json.metadata ?? null,
    theme,
    notFound: true,
    error: false,
  };

  setWindowData(windowData);

  if (notFoundRoute) {
    const components = await notFoundRoute.load();
    setState({
      url: nextUrl,
      route: notFoundRoute,
      params: {},
      components,
      props: notFoundProps,
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
}

async function handleNormalRoute(
  nextUrl: string,
  json: any,
  routes: ClientRouteLoaded[],
  setState: (state: RouteViewState) => void
): Promise<boolean> {
  applyMetadata(json.metadata ?? null);
  
  // Get theme: prioritize cookie (source of truth), then server response, then window data, then default
  // Cookie is the source of truth because it persists across navigation
  let theme: string = "light"; // Default
  if (typeof document !== "undefined") {
    const cookieMatch = document.cookie.match(/theme=([^;]+)/);
    if (cookieMatch) {
      theme = cookieMatch[1];
    } else if (json.theme) {
      theme = json.theme;
    } else {
      const currentTheme = getCurrentTheme();
      if (currentTheme) {
        theme = currentTheme;
      }
    }
  } else if (json.theme) {
    theme = json.theme;
  }
  
  // Include theme in props so layouts receive it during SPA navigation
  const newProps = {
    ...(json.props ?? {}),
    theme, // Always include theme
  };

  const matched = matchRouteClient(nextUrl, routes);

  if (!matched) {
    window.location.href = nextUrl;
    return false;
  }

  const windowData: InitialData = {
    pathname: nextUrl,
    params: matched.params,
    props: newProps,
    metadata: json.metadata ?? null,
    theme,
    notFound: false,
    error: false,
  };

  setWindowData(windowData);

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

  return true;
}

export type NavigateOptions = {
  /**
   * If true, forces revalidation of route data,
   * ignoring the cache and fetching fresh data from the server.
   * Similar to Next.js's `router.refresh()` behavior.
   */
  revalidate?: boolean;
};

export async function navigate(
  nextUrl: string,
  handlers: NavigationHandlers,
  options?: NavigateOptions
): Promise<void> {
  const { setState, routes, notFoundRoute, errorRoute } = handlers;

  try {
    const { ok, json } = await getRouteData(nextUrl, {
      revalidate: options?.revalidate,
    });

    if (json && json.error) {
      console.log("[client] Error detected in response:", json);

      if (errorRoute) {
        const handled = await handleErrorRoute(
          nextUrl,
          json,
          errorRoute,
          setState
        );
        if (handled) return;
      } else {
        console.warn(
          "[client] Error route not available, reloading page.",
          errorRoute
        );
        window.location.href = nextUrl;
        return;
      }
    }

    // 🔴 HTTP error (404/500/etc)
    if (!ok) {
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
      await handleNotFoundRoute(nextUrl, json, notFoundRoute, setState);
      return;
    }

    // Ruta normal
    await handleNormalRoute(nextUrl, json, routes, setState);
  } catch (err) {
    console.error("[client] Error fetching FW data:", err);
    window.location.href = nextUrl;
  }
}

export function createClickHandler(
  navigate: (url: string, options?: NavigateOptions) => void
): (ev: MouseEvent) => void {
  return function handleClick(ev: MouseEvent) {
    try {
      // Salir temprano si el evento ya fue prevenido
      if (ev.defaultPrevented) return;
      
      // Verificar que sea un evento de mouse real (no sintético o de teclado)
      if (ev.type !== "click") return;
      if (ev.button !== 0) return; // Solo botón izquierdo
      if (ev.metaKey || ev.ctrlKey || ev.shiftKey || ev.altKey) return;
      
      // Verificar que el evento tenga coordenadas válidas (eventos de mouse reales las tienen)
      if (ev.clientX === 0 && ev.clientY === 0 && ev.detail === 0) {
        // Podría ser un evento sintético, ser más cauteloso
        const target = ev.target as HTMLElement | null;
        if (target) {
          const tagName = target.tagName.toLowerCase();
          if (tagName === "input" || tagName === "textarea" || tagName === "button" || tagName === "select") {
            return; // Es un input, no procesar eventos sintéticos
          }
        }
      }

      const target = ev.target as HTMLElement | null;
      if (!target) return;

      // Verificar PRIMERO si el target es un elemento interactivo (más rápido)
      const tagName = target.tagName.toLowerCase();
      if (
        tagName === "input" ||
        tagName === "textarea" ||
        tagName === "button" ||
        tagName === "select" ||
        target.isContentEditable ||
        target.getAttribute("contenteditable") === "true"
      ) {
        return; // Es un elemento interactivo, no procesar
      }

      // Verificar si está dentro de un elemento interactivo usando closest (más eficiente que composedPath)
      const interactiveParent = target.closest("input, textarea, button, select, [contenteditable], label");
      if (interactiveParent) {
        // Si el parent es un label, verificar si tiene un control asociado
        if (interactiveParent.tagName.toLowerCase() === "label") {
          const label = interactiveParent as HTMLLabelElement;
          if (label.control) {
            return; // El label tiene un control asociado (input, etc)
          }
        } else {
          return; // Está dentro de un elemento interactivo
        }
      }

      // Solo buscar anchor si no es un elemento interactivo
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

    // Detectar si el link tiene data-revalidate para forzar revalidación
    const shouldRevalidate =
      anchor.hasAttribute("data-revalidate") &&
      anchor.getAttribute("data-revalidate") !== "false";

    window.history.pushState({}, "", nextUrl);
    navigate(nextUrl, shouldRevalidate ? { revalidate: true } : undefined);
    } catch (error) {
      // Silenciar errores para evitar bloquear el navegador
      console.error("[navigation] Error in click handler:", error);
    }
  };
}

export function createPopStateHandler(
  navigate: (url: string, options?: NavigateOptions) => void
): () => void {
  return function handlePopState() {
    const nextUrl = window.location.pathname + window.location.search;
    navigate(nextUrl);
  };
}

