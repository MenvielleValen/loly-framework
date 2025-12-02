import { ApiContext } from "@loly/core";

export const events = [
  {
    name: "onMessage",
    handler: (ctx: ApiContext) => {
      console.log("onMessage", ctx);
    }
  },
  {
    name: "onOpen",
    handler: (ctx: ApiContext) => {
      console.log("onOpen", ctx);
    }
  },
  {
    name: "onClose",
    handler: (ctx: ApiContext) => {
      console.log("onClose", ctx);
    }
  }
];