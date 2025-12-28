export type LolyThemeAPI = {
  set: (theme: string) => void;
  get: () => string;
};

export type ThemeScriptOptions = {
  initialTheme?: string | null;
  channelName?: string;
  cookieName?: string;
  themeClasses?: string[];
};

const DEFAULT_CHANNEL = "loly_theme_channel";
const DEFAULT_COOKIE = "theme";
const DEFAULT_CLASSES = ["light", "dark"];

// Generates a self-executing script that wires the global theme API
export function createThemeInlineScript(options: ThemeScriptOptions): string {
  const {
    initialTheme = null,
    channelName = DEFAULT_CHANNEL,
    cookieName = DEFAULT_COOKIE,
    themeClasses = DEFAULT_CLASSES,
  } = options;

  const serializedInitialTheme =
    initialTheme === undefined
      ? "null"
      : JSON.stringify(initialTheme ?? null);

  const serializedChannel = JSON.stringify(channelName);
  const serializedCookie = JSON.stringify(cookieName);
  const serializedClasses = JSON.stringify(themeClasses);

  return `
(() => {
  const CHANNEL = ${serializedChannel};
  const COOKIE = ${serializedCookie};
  const THEME_CLASSES = ${serializedClasses};
  let currentTheme = ${serializedInitialTheme};

  const getCookie = (name) => {
    const value = \`; \${document.cookie}\`;
    const parts = value.split(\`; \${name}=\`);
    if (parts.length === 2) {
      return parts.pop()?.split(";").shift() || null;
    }
    return null;
  };

  const applyClass = (el, theme) => {
    if (!el) return;
    const classes = (el.className || "")
      .split(" ")
      .filter(Boolean)
      .filter((c) => !THEME_CLASSES.includes(c));
    const newClassName = [...classes, theme].filter(Boolean).join(" ");
    if (el.className !== newClassName) {
      el.className = newClassName;
    }
  };

  const applyTheme = (theme) => {
    const html = document.documentElement;
    applyClass(html, theme);

    const body = document.body;
    if (body) {
      applyClass(body, theme);
    } else {
      document.addEventListener(
        "DOMContentLoaded",
        () => applyClass(document.body, theme),
        { once: true }
      );
    }
  };

  const persistCookie = (theme) => {
    document.cookie = \`\${COOKIE}=\${theme}; path=/; max-age=31536000\`;
  };

  const updateWindowData = (theme) => {
    try {
      if (typeof window !== "undefined") {
        const w = window;
        w.__FW_DATA__ = { ...(w.__FW_DATA__ || {}), theme };
      }
    } catch {
      // noop
    }
  };

  const channel = typeof BroadcastChannel !== "undefined"
    ? new BroadcastChannel(CHANNEL)
    : null;

  const setTheme = (theme, { broadcast = true, persist = true } = {}) => {
    if (typeof theme !== "string" || !theme) return currentTheme;
    if (theme === currentTheme) return currentTheme;

    currentTheme = theme;
    applyTheme(theme);
    if (persist) persistCookie(theme);
    updateWindowData(theme);
    if (broadcast && channel) {
      channel.postMessage({ type: "theme_change", theme });
    }
    return theme;
  };

  const getTheme = () => currentTheme || "light";

  const init = () => {
    const cookieTheme = getCookie(COOKIE);
    const startTheme = currentTheme || cookieTheme || "light";
    setTheme(startTheme, { broadcast: false });
  };

  if (channel) {
    channel.onmessage = (event) => {
      const data = event?.data || {};
      if (data && typeof data.theme === "string") {
        setTheme(data.theme, { broadcast: false });
      }
    };
  }

  const lolyGlobal = (window.loly = window.loly || {});
  lolyGlobal.theme = {
    set: (theme) => setTheme(theme),
    get: () => getTheme(),
  };

  init();
})();
`.trim();
}

export const THEME_CHANNEL = DEFAULT_CHANNEL;
export const THEME_COOKIE = DEFAULT_COOKIE;
export const THEME_CLASSES = DEFAULT_CLASSES;

declare global {
  interface Window {
    loly?: {
      theme?: LolyThemeAPI;
      [key: string]: any;
    };
  }
}

