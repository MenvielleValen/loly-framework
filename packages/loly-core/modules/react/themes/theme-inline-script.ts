import { registerInlineScript } from "../../rendering/inline-scripts";
import {
  createThemeInlineScript,
  THEME_CHANNEL,
  THEME_COOKIE,
  THEME_CLASSES,
} from "./theme-global";

// Register the theme script with high priority to avoid FOUC
registerInlineScript({
  id: "theme-inline",
  priority: 10,
  generateScript: ({ initialTheme }) =>
    createThemeInlineScript({
      initialTheme,
      channelName: THEME_CHANNEL,
      cookieName: THEME_COOKIE,
      themeClasses: THEME_CLASSES,
    }),
});

