import React from "react";

export type InlineScriptData = {
  initialTheme?: string | null;
};

type InlineScript = {
  id: string;
  priority: number;
  generateScript: (data: InlineScriptData) => string;
};

const registry: Map<string, InlineScript> = new Map();

export function registerInlineScript(script: InlineScript): void {
  registry.set(script.id, script);
}

export function getInlineScriptsHTML(
  data: InlineScriptData,
  nonce?: string
): React.ReactElement[] {
  const scripts = Array.from(registry.values()).sort((a, b) => {
    if (a.priority === b.priority) {
      return a.id.localeCompare(b.id);
    }
    return a.priority - b.priority;
  });

  return scripts.map((script) =>
    React.createElement("script", {
      key: script.id,
      nonce,
      dangerouslySetInnerHTML: { __html: script.generateScript(data) },
    })
  );
}

