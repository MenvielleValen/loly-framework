import { InitServerData } from "@lolyjs/core";
import { createModuleLogger } from "@lolyjs/core";

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

