import type { FrameworkConfig } from "@src/config";

export const PAGE_FILE_REGEX = /^page\.(tsx|ts|jsx|js)$/;
export const LAYOUT_FILE_BASENAME = "layout";

/**
 * Creates a regex pattern for page files based on configuration.
 * 
 * @param config - Framework configuration
 * @returns Regex pattern for matching page files
 */
export function createPageFileRegex(config: FrameworkConfig): RegExp {
  const pageName = config.conventions.page;
  return new RegExp(`^${pageName}\\.(tsx|ts|jsx|js)$`);
}

/**
 * Gets the layout file basename from configuration.
 * 
 * @param config - Framework configuration
 * @returns Layout file basename
 */
export function getLayoutFileBasename(config: FrameworkConfig): string {
  return config.conventions.layout;
}