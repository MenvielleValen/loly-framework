import "../app/styles.css";

import { useEffect, useState } from "react";
import { hydrateRoot } from "react-dom/client";
import { routes, type ClientRouteLoaded } from "../.fw/routes-client";

type InitialData = {
  pathname: string;
  params: Record<string, string>;
  props: Record<string, any>;
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

    if (seg.startsWith("[...") && seg.endsWith("]")) {
      // catch-all al final
      if (i !== segments.length - 1) {
        throw new Error(
          `El segmento catch-all "${seg}" en "${pattern}" debe ser el último.`
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
  pathname: string
): { route: ClientRouteLoaded; params: Record<string, string> } | null {
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

// --- Estado global de la app en el cliente ---

type RouteViewState = {
  pathname: string;
  props: Record<string, any>;
};

// --- Vista: arma Page + Layouts con props ---

function RouterView({ state }: { state: RouteViewState }) {
  const matched = matchRouteClient(state.pathname);

  if (!matched) {
    return <h1>404 desde cliente – ruta no encontrada</h1>;
  }

  const { route, params } = matched;
  const extraProps = state.props ?? {};

  let element = <route.Page params={params} {...extraProps} />;

  const layoutChain = route.layouts.slice().reverse();
  for (const Layout of layoutChain) {
    element = (
      <Layout params={params} {...extraProps}>
        {element}
      </Layout>
    );
  }

  return element;
}

// --- AppShell: SPA navigation + data fetching ---

function AppShell({ initialData }: { initialData: InitialData | null }) {
  const [state, setState] = useState<RouteViewState>(() => ({
    pathname: initialData?.pathname ?? window.location.pathname,
    props: initialData?.props ?? {},
  }));

  useEffect(() => {
    async function navigate(nextPath: string) {
      try {
        const res = await fetch(
          nextPath + (nextPath.includes("?") ? "&" : "?") + "__fw_data=1",
          {
            headers: {
              "x-fw-data": "1",
              Accept: "application/json",
            },
          }
        );

        if (!res.ok) {
          // Si el server devuelve 404/500, lo podés manejar acá
          const json = await res.json().catch(() => ({}));
          if (json && json.redirect) {
            window.location.href = json.redirect.destination;
            return;
          }
          // fallback: recargar página
          window.location.href = nextPath;
          return;
        }

        const json = await res.json();

        if (json.redirect) {
          window.location.href = json.redirect.destination;
          return;
        }

        if (json.notFound) {
          // Podrías setear un estado especial de 404
          setState({ pathname: nextPath, props: {} });
          return;
        }

        setState({
          pathname: nextPath,
          props: json.props ?? {},
        });
      } catch (err) {
        console.error("[client] Error fetching FW data:", err);
        window.location.href = nextPath; // fallback duro
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

      const nextPath = url.pathname + url.search;
      if (nextPath === window.location.pathname + window.location.search) return;

      window.history.pushState({}, "", nextPath);
      navigate(nextPath);
    }

    function handlePopState() {
      const nextPath = window.location.pathname + window.location.search;
      // En back/forward también queremos pedir data al server
      navigate(nextPath);
    }

    window.addEventListener("click", handleClick);
    window.addEventListener("popstate", handlePopState);

    return () => {
      window.removeEventListener("click", handleClick);
      window.removeEventListener("popstate", handlePopState);
    };
  }, []);

  return <RouterView state={state} />;
}

// --- hidratación inicial ---

const container = document.getElementById("__app");
const initialData: InitialData | null = window.__FW_DATA__ ?? null;

if (container) {
  hydrateRoot(container, <AppShell initialData={initialData} />);
} else {
  console.error("No se encontró el contenedor #__app para hidratar");
}
