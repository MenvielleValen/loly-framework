/**
 * Helpers module for dynamic imports example
 */
export const helpers = {
  capitalize: (str: string) => str.charAt(0).toUpperCase() + str.slice(1),
  slugify: (str: string) => str.toLowerCase().replace(/\s+/g, "-"),
};

export default helpers;

