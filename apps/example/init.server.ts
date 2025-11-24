import { InitServerData } from "@loly/core";

import { connectDB } from "config/db";
import WebSocket from "ws";

export async function init({
  serverContext,
}: {
  serverContext: InitServerData;
}) {
  const wss = new WebSocket.Server({ server: serverContext?.server });
  
  try {
    await connectDB();
    console.log("[example] DB conectada!");
  } catch (error) {
    console.log("Mongo DB Not found")
  }

  wss.on("connection", (ws) => {
    console.log("New client connected");

    ws.on("message", (message) => {
      console.log(`Received: ${message}`);
      ws.send("Hello from server");
    });

    ws.on("close", () => {
      console.log("Client disconnected");
    });
  });
}
