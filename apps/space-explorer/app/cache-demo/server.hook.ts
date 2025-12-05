import type { ServerLoader } from "@lolyjs/core";

export const getServerSideProps: ServerLoader = async (ctx) => {
  // Simulate fetching data that changes over time
  const timestamp = Date.now();
  const randomData = Math.floor(Math.random() * 1000);
  
  return {
    props: {
      timestamp,
      randomData,
      message: "This data was fetched from the server",
      lastUpdated: new Date().toISOString(),
      counter: randomData,
    },
    metadata: {
      title: "Cache Demo - Loly Framework",
      description: "Demonstrating cache revalidation features",
    },
  };
};

