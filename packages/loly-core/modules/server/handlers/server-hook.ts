import { ServerContext, LoadedRoute, LoaderResult, RedirectResponse, NotFoundResponse } from "@router/index";
import path from "path";

/**
 * Creates a detailed error message for server hook failures.
 */
function createServerHookErrorMessage(
  error: unknown,
  hookType: "page" | "layout",
  routePattern: string,
  filePath?: string
): string {
  const errorMessage = error instanceof Error ? error.message : String(error);
  const errorStack = error instanceof Error ? error.stack : undefined;
  
  let message = `[${hookType.toUpperCase()} SERVER HOOK ERROR]\n`;
  message += `Route: ${routePattern}\n`;
  
  if (filePath) {
    const relativePath = path.relative(process.cwd(), filePath);
    message += `File: ${relativePath}\n`;
  }
  
  message += `Error: ${errorMessage}\n`;
  
  // Add common suggestions
  if (errorMessage.includes("Cannot find module")) {
    message += `\n💡 Suggestion: Check that all imports in your ${hookType}.server.hook.ts are correct.\n`;
  } else if (errorMessage.includes("is not defined") || errorMessage.includes("Cannot read property")) {
    message += `\n💡 Suggestion: Verify that all variables and properties exist in your ${hookType}.server.hook.ts.\n`;
  } else if (errorMessage.includes("async") || errorMessage.includes("await")) {
    message += `\n💡 Suggestion: Make sure getServerSideProps is an async function and all promises are awaited.\n`;
  }
  
  if (errorStack) {
    message += `\nStack trace:\n${errorStack}`;
  }
  
  return message;
}

/**
 * Executes the route server hook (getServerSideProps) if it exists.
 * Wraps errors with helpful context information.
 *
 * @param route - Route definition
 * @param ctx - Server context
 * @returns Loader result, RedirectResponse, or NotFoundResponse
 * @throws Error with detailed context if server hook fails
 */
export async function runRouteServerHook(
  route: LoadedRoute<any, any>,
  ctx: ServerContext
): Promise<LoaderResult<any> | RedirectResponse | NotFoundResponse> {
  if (!route.loader) {
    return { props: {} };
  }

  try {
    return await route.loader(ctx);
  } catch (error) {
    const detailedError = new Error(
      createServerHookErrorMessage(error, "page", route.pattern, route.pageFile)
    );
    
    // Preserve original error stack if available
    if (error instanceof Error && error.stack) {
      detailedError.stack = error.stack;
    }
    
    // Attach original error for logging
    (detailedError as any).originalError = error;
    
    throw detailedError;
  }
}

