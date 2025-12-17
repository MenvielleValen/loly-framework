import { InitServerData } from "@lolyjs/core";
import { createModuleLogger } from "@lolyjs/core";
import { getAllPlanets, getPlanet, getAllAstronauts } from "@/lib/space-api";
import { cn } from "@/lib/utils";

const logger = createModuleLogger("space-explorer-init");

export async function init({
  serverContext,
}: {
  serverContext: InitServerData;
}) {
  logger.info("🚀 Space Explorer initialized", {
    timestamp: new Date().toISOString(),
  });

  // ============================================
  // PATH ALIAS RESOLUTION TESTS
  // ============================================
  // These tests verify that path aliases (@/lib/*) work correctly
  // in init.server.ts when compiled with bundle: false

  // Test 1: Static import - direct function call
  try {
    const planets = getAllPlanets();
    logger.info("✅ Test 1: Static import - getAllPlanets()", {
      planetsCount: planets.length,
      examplePlanet: planets[0]?.name,
    });
  } catch (error) {
    logger.error("❌ Test 1: Static import failed", {
      error: error instanceof Error ? error.message : String(error),
    });
  }

  // Test 2: Static import - multiple functions from same module
  try {
    const earth = getPlanet("earth");
    const mars = getPlanet("mars");
    logger.info("✅ Test 2: Static import - multiple functions", {
      earth: earth?.name,
      mars: mars?.name,
    });
  } catch (error) {
    logger.error("❌ Test 2: Multiple functions import failed", {
      error: error instanceof Error ? error.message : String(error),
    });
  }

  // Test 3: Static import - from different module (utils)
  try {
    const className = cn("test", "class");
    logger.info("✅ Test 3: Static import - from @/lib/utils", {
      className,
    });
  } catch (error) {
    logger.error("❌ Test 3: Utils import failed", {
      error: error instanceof Error ? error.message : String(error),
    });
  }

  // Test 4: Dynamic import - this is the critical test case
  // Dynamic imports are resolved at runtime, so they need special handling
  try {
    const { getAllAstronauts: getAstronautsDynamic } = await import("@/lib/space-api");
    const astronauts = getAstronautsDynamic();
    logger.info("✅ Test 4: Dynamic import - await import('@/lib/...')", {
      astronautsCount: astronauts.length,
      exampleAstronaut: astronauts[0]?.name,
    });
  } catch (error) {
    logger.error("❌ Test 4: Dynamic import failed", {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });
  }

  // Test 5: Dynamic import with error handling (like the user's example)
  try {
    const { getAllPlanets: getPlanetsDynamic } = await import("@/lib/space-api");
    const planetsDynamic = getPlanetsDynamic();
    logger.info("✅ Test 5: Dynamic import with error handling", {
      planetsCount: planetsDynamic.length,
    });
  } catch (error) {
    // This should not fail, but if it does, log it
    logger.error("❌ Test 5: Dynamic import with error handling failed", {
      error: error instanceof Error ? error.message : String(error),
    });
  }

  // Test 6: Verify that static imports still work after dynamic imports
  try {
    const allAstronauts = getAllAstronauts();
    logger.info("✅ Test 6: Static import after dynamic import", {
      astronautsCount: allAstronauts.length,
    });
  } catch (error) {
    logger.error("❌ Test 6: Static import after dynamic failed", {
      error: error instanceof Error ? error.message : String(error),
    });
  }

  logger.info("🎯 All path alias resolution tests completed");
}

