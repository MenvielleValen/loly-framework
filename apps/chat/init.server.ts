import { InitServerData } from "@loly/core";
import WebSocket from "ws";

export async function init({
  serverContext,
}: {
  serverContext: InitServerData;
}) {
  const wss = new WebSocket.Server({ server: serverContext?.server });

  wss.on("connection", (ws) => {
    console.log("New client connected");

    ws.on("message", (raw) => {
      console.log(`Received: ${raw}`);

      let parsed: any;
      try {
        parsed = JSON.parse(raw.toString());
      } catch {
        return;
      }

      if (parsed.type !== "chat") return;

      const payload = JSON.stringify({
        type: "chat",
        text: parsed.text,
        fromClientId: parsed.fromClientId,
        at: parsed.at ?? Date.now(),
      });

      // 🔁 Enviar a todos los clientes conectados
      wss.clients.forEach((client) => {
        if (client.readyState === WebSocket.OPEN) {
          client.send(payload);
        }
      });
    });

    ws.on("close", () => {
      console.log("Client disconnected");
    });
  });
}
