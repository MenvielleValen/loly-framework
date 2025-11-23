import React, { useEffect, useRef, useState } from "react";

type ChatMessage = {
  id: string;
  text: string;
  from: "me" | "server" | "system";
  at: Date;
};

type IncomingPayload =
  | {
      type: "chat";
      text: string;
      fromClientId: string;
      at?: number;
    }
  | Record<string, any>;

export default function HomePage() {
  const [socket, setSocket] = useState<WebSocket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  // 👤 id único por pestaña
  const [clientId] = useState(() => crypto.randomUUID());

  useEffect(() => {
    const wsUrl = "ws://localhost:3000/chat"; // ajustá el puerto si hace falta

    const ws = new WebSocket(wsUrl);
    setSocket(ws);

    const addMessage = (msg: ChatMessage) =>
      setMessages((prev) => [...prev, msg]);

    ws.onopen = () => {
      setIsConnected(true);
      addMessage({
        id: crypto.randomUUID(),
        text: "Conectado al servidor de WebSocket ✅",
        from: "system",
        at: new Date(),
      });
    };

    ws.onmessage = (event) => {
      const raw = event.data;

      let parsed: IncomingPayload | null = null;
      try {
        parsed = JSON.parse(raw);
      } catch {}

      if (parsed && parsed.type === "chat") {
        const isMe = parsed.fromClientId === clientId;

        addMessage({
          id: crypto.randomUUID(),
          text: parsed.text,
          from: isMe ? "me" : "server",
          at: new Date(parsed.at ?? Date.now()),
        });
        return;
      }

      // fallback: texto plano
      addMessage({
        id: crypto.randomUUID(),
        text: String(raw),
        from: "server",
        at: new Date(),
      });
    };

    ws.onclose = () => {
      setIsConnected(false);
      addMessage({
        id: crypto.randomUUID(),
        text: "Conexión cerrada ❌",
        from: "system",
        at: new Date(),
      });
    };

    ws.onerror = () => {
      addMessage({
        id: crypto.randomUUID(),
        text: "Ocurrió un error en el WebSocket ⚠️",
        from: "system",
        at: new Date(),
      });
    };

    return () => {
      ws.close();
    };
  }, [clientId]);

  // ⬇️ Auto scroll al último mensaje
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  function handleSend() {
    if (!socket || socket.readyState !== WebSocket.OPEN) return;
    const trimmed = input.trim();
    if (!trimmed) return;

    const payload = {
      type: "chat" as const,
      text: trimmed,
      fromClientId: clientId,
      at: Date.now(),
    };

    socket.send(JSON.stringify(payload));
    setInput("");
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  return (
    <main className="flex items-center justify-center h-full">
      <div className="w-full max-w-2xl bg-gray-800 border border-gray-700 rounded-xl p-5 flex flex-col gap-4 shadow-lg">
        <header className="flex items-center justify-between gap-2">
          <div>
            <h2 className="text-xl font-semibold">Chat demo (WebSocket)</h2>
            <p className="text-sm text-gray-300">
              Página Home (/) – ejemplo de cliente WS con React.
            </p>
          </div>

          <div
            className={`flex items-center gap-2 text-xs px-3 py-1 rounded-full ${
              isConnected
                ? "bg-emerald-900/60 text-emerald-200"
                : "bg-red-900/60 text-red-200"
            }`}
          >
            <span
              className={`h-2 w-2 rounded-full ${
                isConnected ? "bg-emerald-400" : "bg-red-400"
              }`}
            />
            {isConnected ? "Conectado" : "Desconectado"}
          </div>
        </header>

        {/* Lista de mensajes */}
        <section className="flex-1 min-h-[420px] max-h-[420px] overflow-y-auto rounded-lg bg-gray-900/70 px-3 py-2 space-y-2 text-sm">
          {messages.length === 0 && (
            <p className="text-gray-400 text-center mt-8">
              Todavía no hay mensajes. Escribí algo para probar el chat.
            </p>
          )}

          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex ${
                msg.from === "me"
                  ? "justify-end"
                  : msg.from === "server"
                  ? "justify-start"
                  : "justify-center"
              }`}
            >
              <div
                className={`max-w-[75%] rounded-lg px-3 py-2 text-xs leading-snug ${
                  msg.from === "me"
                    ? "bg-blue-600 text-white"
                    : msg.from === "server"
                    ? "bg-gray-700 text-gray-100"
                    : "bg-gray-500/40 text-gray-100"
                }`}
              >
                <div className="mb-1 text-[10px] opacity-70">
                  {msg.from === "me"
                    ? "Vos"
                    : msg.from === "server"
                    ? "Anónimo"
                    : "Sistema"}
                </div>
                <div>{msg.text}</div>
                <div className="mt-1 text-[9px] opacity-60 text-right">
                  {msg.at.toLocaleTimeString()}
                </div>
              </div>
            </div>
          ))}

          <div ref={messagesEndRef} />
        </section>

        {/* Input */}
        <form
          className="flex items-center gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            handleSend();
          }}
        >
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={
              isConnected
                ? "Escribí un mensaje y presioná Enter…"
                : "Esperando conexión al WebSocket…"
            }
            className="flex-1 rounded-lg bg-gray-900 border border-gray-700 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            type="submit"
            disabled={!isConnected || !input.trim()}
            className="px-4 py-2 rounded-lg bg-blue-600 text-sm font-medium disabled:opacity-40 disabled:cursor-not-allowed hover:bg-blue-500 transition-colors"
          >
            Enviar
          </button>
        </form>

        <p className="text-[11px] text-gray-400 mt-1">
          Este componente se monta en Home (/) y se conecta a{" "}
          <code className="bg-gray-900 px-1 rounded">
            ws://localhost:3000/chat
          </code>
          .
        </p>
      </div>
    </main>
  );
}
