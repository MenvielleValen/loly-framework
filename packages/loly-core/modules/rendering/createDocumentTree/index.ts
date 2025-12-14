import React, { ReactElement } from "react";
import type { LoaderResult, PageComponent, LoadedRoute } from "@router/index";
import { InitialData, RouterData } from "../index.types";
import {
  WINDOW_DATA_KEY,
  APP_CONTAINER_ID,
  FAVICON_PATH,
  ROUTER_DATA_KEY,
} from "@constants/globals";

/**
 * Builds the app tree (Page + layouts) in the same way for SSR and SSG.
 *
 * @param route - Route definition
 * @param params - Route parameters
 * @param props - Props from loader
 * @returns React element tree
 */
/**
 * Builds the app tree (Page + layouts) in the same way for SSR and SSG.
 *
 * @param route - Route definition
 * @param params - Route parameters
 * @param props - Props from loader (combined layout + page props)
 * @returns React element tree
 */
export function buildAppTree(
  route: LoadedRoute,
  params: Record<string, string>,
  props: Record<string, any>
): ReactElement {
  const Page = route.component;

  let appTree: ReactElement = React.createElement(Page, {
    params,
    ...props,
  } as any);

  const layoutChain = route.layouts.slice().reverse();

  for (const Layout of layoutChain) {
    appTree = React.createElement(Layout, {
      params,
      ...props,
      children: appTree,
    } as any);
  }

  return appTree;
}

/**
 * Builds the complete HTML document tree. Used by both SSR and SSG.
 *
 * @param options - Document tree options
 * @returns React element representing the HTML document
 */
export function createDocumentTree(options: {
  appTree: ReactElement;
  initialData: InitialData;
  routerData: RouterData;
  meta: LoaderResult<any>["metadata"];
  titleFallback?: string;
  descriptionFallback?: string;
  chunkHref?: string | null;
  entrypointFiles?: string[]; // All JS files for client entrypoint in order (runtime, vendor, commons, entry)
  theme?: string;
  clientJsPath?: string;
  clientCssPath?: string;
  nonce?: string;
}): ReactElement {
  const {
    appTree,
    initialData,
    routerData,
    meta,
    titleFallback,
    descriptionFallback,
    chunkHref,
    entrypointFiles = [],
    theme,
    clientJsPath = "/static/client.js",
    clientCssPath = "/static/client.css",
    nonce,
  } = options;

  const metaObj = meta ?? {};
  const title = (metaObj as any).title ?? titleFallback ?? "My Framework Dev";
  const lang = (metaObj as any).lang ?? "en";
  const description =
    (metaObj as any).description ??
    descriptionFallback ??
    "Demo Loly framework";

  const extraMetaTags: ReactElement[] = [];

  if (description) {
    extraMetaTags.push(
      React.createElement("meta", {
        name: "description",
        content: description,
      })
    );
  }

  if (Array.isArray((metaObj as any).metaTags)) {
    for (const tag of (metaObj as any).metaTags) {
      extraMetaTags.push(
        React.createElement("meta", {
          name: tag.name,
          property: tag.property,
          content: tag.content,
        })
      );
    }
  }

  const serialized = JSON.stringify({
    ...initialData,
    theme,
  });

  const routerSerialized = JSON.stringify({
    ...routerData,
  });

  const documentTree = React.createElement(
    "html",
    { lang },
    React.createElement(
      "head",
      null,
      React.createElement("meta", { charSet: "utf-8" }),
      React.createElement("title", null, title),
      React.createElement("meta", {
        name: "viewport",
        content: "width=device-width, initial-scale=1",
      }),
      ...extraMetaTags,
      // Preload all entrypoint files except the last one (runtime, vendor, commons)
      // The last file is the main entry which we load as a script
      ...(entrypointFiles.length > 0
        ? entrypointFiles.slice(0, -1).map((file) =>
            React.createElement("link", {
              key: `preload-${file}`,
              rel: "preload",
              href: file,
              as: "script",
            })
          )
        : []),
      // Preload route-specific chunk if available
      chunkHref &&
        React.createElement("link", {
          key: `preload-${chunkHref}`,
          rel: "preload",
          href: chunkHref,
          as: "script",
        }),
      React.createElement("link", {
        rel: "icon",
        href: FAVICON_PATH,
        type: "image/png",
      }),
      React.createElement("link", {
        rel: "stylesheet",
        href: clientCssPath,
      }),
      // Execute ALL entrypoint files in order (runtime, vendor, commons, entry)
      // With defer, browser downloads in parallel but executes in DOM order
      ...(entrypointFiles.length > 0
        ? entrypointFiles.map((file) =>
            React.createElement("script", {
              key: file,
              src: file,
              defer: true,
              nonce, // CSP nonce for external scripts
            })
          )
        : [
            React.createElement("script", {
              key: "client",
              src: clientJsPath,
              defer: true,
              nonce, // CSP nonce for external scripts
            }),
          ])
    ),
    React.createElement(
      "body",
      { 
        style: { margin: 0 }, 
        className: [initialData.className || "", theme].filter(Boolean).join(" "),
        suppressHydrationWarning: true // Allow theme class to differ between server and client initially
      },
      React.createElement("div", { id: APP_CONTAINER_ID }, appTree)
    ),
    React.createElement("script", {
      nonce: nonce,
      dangerouslySetInnerHTML: {
        __html: `window.${WINDOW_DATA_KEY} = ${serialized};`,
      },
    }),
    React.createElement("script", {
      nonce: nonce,
      dangerouslySetInnerHTML: {
        __html: `window.${ROUTER_DATA_KEY} = ${routerSerialized};`,
      },
    })
  );

  return documentTree;
}
