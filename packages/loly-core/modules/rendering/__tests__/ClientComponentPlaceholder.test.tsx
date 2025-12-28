import React from "react";
import { describe, it, expect } from "vitest";
import {
  ClientComponentPlaceholder,
  serializeProps,
  generatePlaceholderHTML,
} from "../ClientComponentPlaceholder";
import { renderToString } from "react-dom/server";

describe("ClientComponentPlaceholder", () => {
  it("renders a div with data attributes and suppressHydrationWarning", () => {
    const html = renderToString(
      React.createElement(ClientComponentPlaceholder, {
        componentName: "ThemeSwitcher",
        filePath: "components/ui/theme-switcher.client.tsx",
        props: { foo: "bar" },
      })
    );

    expect(html).toContain('data-client-component="ThemeSwitcher"');
    expect(html).toContain('data-client-file="components/ui/theme-switcher.client.tsx"');
    expect(html).toContain('data-client-props="{&quot;foo&quot;:&quot;bar&quot;}"');
  });

  it("filters non-serializable props", () => {
    const props = {
      ok: "yes",
      skipFunc: () => {},
      child: React.createElement("div"),
    };
    const serialized = serializeProps(props);
    expect(serialized).toBe(JSON.stringify({ ok: "yes" }));
  });

  it("generates stable placeholder HTML string", () => {
    const html = generatePlaceholderHTML(
      "ThemeSwitcher",
      "components/ui/theme-switcher.client.tsx",
      { foo: "bar" },
      "default"
    );

    expect(html).toContain('data-client-component="ThemeSwitcher"');
    expect(html).toContain('data-client-file="components/ui/theme-switcher.client.tsx"');
    expect(html).toContain('data-export-name="default"');
    expect(html).toContain('data-client-props="{&quot;foo&quot;:&quot;bar&quot;}"');
  });
});

