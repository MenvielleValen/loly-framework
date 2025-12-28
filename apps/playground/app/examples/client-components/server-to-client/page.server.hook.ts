import type { ServerLoader } from "@lolyjs/core";

/**
 * Server hook that demonstrates passing complex data from server to client components.
 * 
 * This example shows:
 * - Simple primitives (strings, numbers, booleans)
 * - Complex objects with nested structures
 * - Arrays of objects
 * - Dates (serialized as ISO strings)
 * - Functions are NOT serializable (will be filtered out)
 * - React elements are NOT serializable (will be filtered out)
 */
export const getServerSideProps: ServerLoader = async () => {
  // Simulate async data fetching
  await new Promise(resolve => setTimeout(resolve, 100));

  return {
    props: {
      // Simple primitives
      title: "Server-to-Client Data Flow",
      count: 42,
      isActive: true,
      score: 95.5,
      
      // Complex nested object
      user: {
        id: 1,
        name: "John Doe",
        email: "john@example.com",
        profile: {
          avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=John",
          bio: "Full-stack developer passionate about React and TypeScript",
          location: {
            city: "San Francisco",
            country: "USA",
            coordinates: {
              lat: 37.7749,
              lng: -122.4194,
            },
          },
        },
        preferences: {
          theme: "dark",
          notifications: true,
          language: "en",
        },
      },
      
      // Array of objects
      items: [
        { id: 1, name: "Item 1", price: 19.99, inStock: true },
        { id: 2, name: "Item 2", price: 29.99, inStock: false },
        { id: 3, name: "Item 3", price: 39.99, inStock: true },
      ],
      
      // Dates (will be serialized as ISO strings)
      createdAt: new Date("2024-01-15T10:30:00Z"),
      updatedAt: new Date("2024-12-20T14:45:00Z"),
      
      // Array of primitives
      tags: ["react", "typescript", "server-components", "islands"],
      
      // Null and undefined handling
      optionalField: null,
      // undefined fields are automatically omitted
      
      // Nested arrays
      matrix: [
        [1, 2, 3],
        [4, 5, 6],
        [7, 8, 9],
      ],
      
      // Empty structures
      emptyArray: [],
      emptyObject: {},
    },
    metadata: {
      title: "Server-to-Client Data Flow Example",
      description: "Demonstrates passing complex data from server hooks to client components",
    },
  };
};

