import type { ServerLoader } from "@lolyjs/core";

// Mock data store
const items: Record<string, { id: string; name: string; description: string }> = {
  "999": {
    id: "999",
    name: "Example Item",
    description: "This is an example item that exists in the mock database.",
  },
};

/**
 * Example: Conditional Not Found based on data availability
 * 
 * This demonstrates returning 404 when a resource doesn't exist.
 * In a real application, you would fetch from a database or API.
 */
export const getServerSideProps: ServerLoader = async (ctx) => {
  const itemId = ctx.params.id;

  // Simulate fetching item from database
  const item = items[itemId];

  // If item doesn't exist, return 404
  if (!item) {
    return ctx.NotFound();
  }

  // Return item data
  return {
    props: {
      item,
    },
    metadata: {
      title: `Item: ${item.name}`,
      description: item.description,
    },
  };
};

