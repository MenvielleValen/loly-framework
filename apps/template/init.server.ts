import { InitServerData } from "@lolyjs/core";
import { createModuleLogger } from "@lolyjs/core";

const logger = createModuleLogger("template-init");

export async function init({
  serverContext,
}: {
  serverContext: InitServerData;
}) {
  logger.info("🚀 Template app initialized", {
    timestamp: new Date().toISOString(),
  });
}
