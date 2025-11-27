export const config = (env: string): any => {
  console.log("[loly.config] Environment:", env);

  return {
    bodyLimit: "1mb",
    corsOrigin: '*'
  };
};
