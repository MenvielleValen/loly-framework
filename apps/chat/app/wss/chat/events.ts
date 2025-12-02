import { WssContext } from "@loly/core";

/**
 * WebSocket event handlers for the chat namespace.
 * 
 * These handlers are automatically registered by the framework when a client
 * connects to the '/chat' namespace.
 */
export const events = [
  {
    name: "connection",
    handler: (ctx: WssContext) => {
      console.log("Client connected", ctx.socket.id);
    }
  },
  {
    name: "chat",
    handler: (ctx: WssContext) => {
      const { socket, data } = ctx;
      
      // Data is already parsed by Socket.IO, no need for JSON.parse
      // Build the payload with chat message data
      const payload = {
        type: "chat",
        text: data.text,
        fromClientId: data.fromClientId,
        at: data.at ?? Date.now(),
      };

      // Broadcast the message to all clients in the namespace
      // Using socket.nsp.emit() sends to all sockets in this namespace
      socket.nsp.emit("chat", payload); //@TODO Add custom function in ctx
      
      // Alternative: exclude the sender from receiving the message
      // socket.broadcast.emit("chat", payload);
    }
  },
  {
    name: "disconnect",
    handler: (ctx: WssContext) => {
      console.log("Client disconnected", ctx.socket.id);
    }
  }
];