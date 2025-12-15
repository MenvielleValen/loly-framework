import type { ServerLoader } from "@lolyjs/core";

// Global counter to track executions (in a real app, this would be in a database or cache)
// This is just for demonstration purposes
let pageHookExecutionCount = 0;

/**
 * Page server hook for test page.
 * This demonstrates that page hooks execute on every navigation (SPA and initial load).
 */
export const getServerSideProps: ServerLoader = async () => {
  // Increment execution counter
  pageHookExecutionCount++;
  
  const executionTimestamp = new Date().toISOString();

  return {
    props: {
      pageHookExecutions: pageHookExecutionCount,
      executionTimestamp,
    },
    metadata: {
      title: "Test Hooks | Space Explorer",
      description: "Test page to verify server hooks execution behavior",
    },
  };
};
