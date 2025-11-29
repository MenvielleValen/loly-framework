import { InitServerData } from "@loly/core";
import { createModuleLogger } from "@loly/core";

const logger = createModuleLogger("space-explorer-init");

export async function init({
  serverContext,
}: {
  serverContext: InitServerData;
}) {
  logger.info("🚀 Space Explorer initialized", {
    timestamp: new Date().toISOString(),
  });
}

