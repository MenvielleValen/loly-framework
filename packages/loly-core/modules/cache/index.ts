export function withCache(fn: any, options: any): any {
  const ttl = options.ttl ?? 60;

  return async function cachedGssp(ctx: any): Promise<any> {
    return await fn(ctx);
  };
}
