import { ApiContext } from "@lolyjs/core";

export const events = [
  {
    name: "onMessage",
    handler: (ctx: ApiContext) => {
      // Handle message event
    }
  },
  {
    name: "onOpen",
    handler: (ctx: ApiContext) => {
      // Handle open event
    }
  },
  {
    name: "onClose",
    handler: (ctx: ApiContext) => {
      // Handle close event
    }
  }
];