import "../app/styles.css";

import { useEffect, useState } from "react";
import { hydrateRoot } from "react-dom/client";
import {
  routes,
  type ClientRouteLoaded,
  type ClientLoadedComponents,
} from "../.fw/routes-client";

type InitialData = {
  pathname: string;
  params: Record<string, string>;
  props: Record<string, any>;
  metadata?: {
    title?: string;
    description?: string;
  } | null;
};

declare global {
  interface Window {
    __FW_DATA__?: InitialData;
  }
}

// --- helpers de matching ---

function buildClientRegexFromPattern(pattern: string): RegExp {
  const segments = pattern.split("/").filter(Boolean);
  const regexParts: string[] = [];

  for (let i = 0; i < segments.length; i++) {
    const seg = segments[i];

    // catch-all [...slug]
    if (seg.startsWith("[...") && seg.endsWith("]")) {
      if (i !== segments.length - 1) {
        throw new Error(
          `El segmento catch-all "${seg}" en "${pattern}" debe ser el último.`
        );
      }
      regexParts.push("(.+)");
      continue;
    }

    // param normal [slug]
    if (seg.startsWith("[") && seg.endsWith("]")) {
      regexParts.push("([^/]+)");
      continue;
    }

    // literal
    const escaped = seg.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    regexParts.push(escaped);
  }

  const regexSource = "^/" + regexParts.join("/") + "/?$";
  return new RegExp(regexSource);
}

function matchRouteClient(
  pathWithSearch: string
): { route: ClientRouteLoaded; params: Record<string, string> } | null {
  const [pathname] = pathWithSearch.split("?"); // ignoramos query para matchear
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

function setupHotReloadClient() {
  if (typeof window === "undefined") return;

  // Podrías chequear NODE_ENV si tenés un define, pero en dev
  // no molesta que se conecte siempre.
  try {
    const es = new EventSource("/__fw/hot");

    es.onmessage = (ev) => {
      if (!ev.data) return;

      if (ev.data.startsWith("reload:")) {
        const file = ev.data.slice("reload:".length);
        console.log("[hot-reload] Cambio detectado:", file);
        // Live reload simple:
        window.location.reload();
      }
    };

    es.onerror = (err) => {
      console.warn("[hot-reload] Error en EventSource:", err);
      // Opcional: reconectar luego de un tiempo
    };

    console.log("[hot-reload] EventSource conectado a /__fw/hot");
  } catch (err) {
    console.error("[hot-reload] No se pudo conectar:", err);
  }
}

// --- Estado global de la app en el cliente ---

type RouteViewState = {
  url: string; // path + search
  route: ClientRouteLoaded | null;
  params: Record<string, string>;
  components: ClientLoadedComponents | null;
  props: Record<string, any>;
};

// --- Vista: arma Page + Layouts con props ya cargados ---

function RouterView({ state }: { state: RouteViewState }) {
  if (!state.route) {
    return <h1>404 desde cliente – ruta no encontrada</h1>;
  }

  if (!state.components) {
    // Para la ruta inicial, components NO es null (los cargamos antes de hydrateRoot),
    // así que no hay mismatch con el SSR.
    // En navegación SPA puede ser null un ratito mientras cargan los módulos.
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

// --- AppShell: SPA navigation + data fetching + carga de módulos ---

interface AppShellProps {
  initialState: RouteViewState;
}

function AppShell({ initialState }: AppShellProps) {
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

        if (!res.ok) {
          const json = await res.json().catch(() => ({}));
          if (json && (json as any).redirect) {
            window.location.href = (json as any).redirect.destination;
            return;
          }
          window.location.href = nextUrl;
          return;
        }

        const json = await res.json();

        console.log("JSON", json);

        if (json.redirect) {
          window.location.href = json.redirect.destination;
          return;
        }

        if (json.notFound) {
          // manejamos 404 en cliente (sin props ni componentes)
          const match404 = matchRouteClient(nextUrl);
          setState({
            url: nextUrl,
            route: match404?.route ?? null,
            params: match404?.params ?? {},
            components: null,
            props: {},
          });
          return;
        }

        applyMetadata(json.metadata ?? null);

        const newProps = json.props ?? {};

        // resolve de la ruta y carga de módulos para la ruta destino
        const matched = matchRouteClient(nextUrl);
        if (!matched) {
          window.location.href = nextUrl;
          return;
        }

        window.__FW_DATA__ = {
          ...window.__FW_DATA__,
          params: matched.params,
          props: newProps,
          pathname: nextUrl,
        }

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
        window.location.href = nextUrl; // fallback duro
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
  }, []); // solo se configura una vez

  return <RouterView state={state} />;
}

// --- hidratación inicial con load() YA resuelto para la ruta actual ---
console.log("ENV", process.env.NODE_ENV)
if (process.env.NODE_ENV === "development") {
  setupHotReloadClient();
}

(async function bootstrap() {
  const container = document.getElementById("__app");
  const initialData: InitialData | null = window.__FW_DATA__ ?? null;

  console.log('Initial Data', initialData);

  if (!container) {
    console.error("No se encontró el contenedor #__app para hidratar");
    return;
  }

  const initialUrl = window.location.pathname + window.location.search;

  const match = matchRouteClient(initialUrl);
  let initialRoute: ClientRouteLoaded | null = null;
  let initialParams: Record<string, string> = {};
  let initialComponents: ClientLoadedComponents | null = null;

  if (match) {
    initialRoute = match.route;
    initialParams = match.params;
    // 🔹 Cargamos los módulos de la ruta inicial ANTES de hidratar
    initialComponents = await match.route.load();
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

  hydrateRoot(container, <AppShell initialState={initialState} />);
})();
