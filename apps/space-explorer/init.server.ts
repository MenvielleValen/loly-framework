import { InitServerData } from "@lolyjs/core";
import { createModuleLogger } from "@lolyjs/core";
import { getAllPlanets } from "@/lib/space-api";

const logger = createModuleLogger("space-explorer-init");

export async function init({
  serverContext,
}: {
  serverContext: InitServerData;
}) {
  logger.info("🚀 Space Explorer initialized", {
    timestamp: new Date().toISOString(),
  });

  // Example: Test path alias resolution from @/lib
  // This verifies that imports from lib directory work correctly in init.server
  try {
    const planets = getAllPlanets();
    logger.info("✅ Path alias resolution test successful", {
      planetsCount: planets.length,
      examplePlanet: planets[0]?.name,
    });
  } catch (error) {
    logger.error("❌ Path alias resolution test failed", {
      error: error instanceof Error ? error.message : String(error),
    });
  }
}

