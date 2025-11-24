// server/rendering.ts
import React, { ReactElement } from "react";
import type { LoaderResult, PageComponent, LoadedRoute } from "@router/index";
import { InitialData } from "../index.types";

/**
 * Construye el appTree (Page + layouts) de la misma forma en SSR y SSG
 */
export function buildAppTree(
  route: LoadedRoute,
  params: Record<string, string>,
  props: any
): ReactElement {
  const Page = route.component as PageComponent;

  let appTree: ReactElement = React.createElement(Page, {
    params,
    ...props,
  });

  const layoutChain = route.layouts.slice().reverse();

  for (const Layout of layoutChain) {
    appTree = React.createElement(Layout as PageComponent, {
      params,
      ...props,
      children: appTree,
    });
  }

  return appTree;
}

/**
 * Arma el árbol <html> completo. SSR y SSG usan esto.
 */
export function createDocumentTree(options: {
  appTree: ReactElement;
  initialData: InitialData;
  meta: LoaderResult["metadata"];
  titleFallback?: string;
  descriptionFallback?: string;
  chunkHref?: string | null;
}): ReactElement {
  const {
    appTree,
    initialData,
    meta,
    titleFallback,
    descriptionFallback,
    chunkHref,
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

  const serialized = JSON.stringify(initialData);

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
      chunkHref &&
        React.createElement("link", {
          rel: "modulepreload",
          href: chunkHref,
          as: "script",
        }),
      React.createElement("link", {
        rel: "icon",
        href: "/static/favicon.png",
        type: "image/png",
      }),
      React.createElement("link", {
        rel: "stylesheet",
        href: "/static/client.css",
      }),
      React.createElement("script", {
        src: "/static/client.js",
        defer: true,
      })
    ),
    React.createElement(
      "body",
      { style: { margin: 0 } },
      React.createElement("div", { id: "__app" }, appTree)
    ),
    React.createElement("script", {
      dangerouslySetInnerHTML: {
        __html: `window.__FW_DATA__ = ${serialized};`,
      },
    })
  );

  return documentTree;
}
