"use client";

import { useEffect, useState, useRef } from "react";
import { lolySocket } from "@lolyjs/core/sockets";
import type { Socket } from "socket.io-client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface ChatMessage {
  id: string;
  userId?: string;
  userName?: string;
  text: string;
  timestamp: number;
  type?: "system" | "user";
}

export default function ChatPage() {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentRoom, setCurrentRoom] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Simular token de auth (en producción vendría de tu sistema de auth)
    const userId = `user-${Math.random().toString(36).substr(2, 9)}`;
    
    const socketInstance = lolySocket("/chat", {
      auth: {
        token: userId, // Simula token para auth hook
      },
    });
    
    setSocket(socketInstance);

    socketInstance.on("connect", () => {
      setConnected(true);
      setError(null);
      console.log("✅ Connected to chat namespace");
    });

    socketInstance.on("disconnect", () => {
      setConnected(false);
      console.log("❌ Disconnected from chat namespace");
    });

    socketInstance.on("chat-history", (data: { messages: ChatMessage[] }) => {
      setMessages(data.messages);
      scrollToBottom();
    });

    socketInstance.on("message", (message: ChatMessage) => {
      setMessages((prev) => [...prev, message]);
      scrollToBottom();
    });

    socketInstance.on("user-joined", (data: { userId: string; userName: string }) => {
      setMessages((prev) => [
        ...prev,
        {
          id: `system-${Date.now()}`,
          type: "system",
          text: `${data.userName} se unió al chat`,
          timestamp: Date.now(),
        },
      ]);
      scrollToBottom();
    });

    socketInstance.on("user-left", (data: { userId: string; userName: string }) => {
      setMessages((prev) => [
        ...prev,
        {
          id: `system-${Date.now()}`,
          type: "system",
          text: `${data.userName} dejó el chat`,
          timestamp: Date.now(),
        },
      ]);
      scrollToBottom();
    });

    socketInstance.on("user-joined-room", (data: { userName: string; roomId: string }) => {
      setMessages((prev) => [
        ...prev,
        {
          id: `system-${Date.now()}`,
          type: "system",
          text: `${data.userName} se unió a la sala ${data.roomId}`,
          timestamp: Date.now(),
        },
      ]);
      scrollToBottom();
    });

    socketInstance.on("private-message", (data: { fromName: string; text: string }) => {
      setMessages((prev) => [
        ...prev,
        {
          id: `private-${Date.now()}`,
          type: "user",
          text: `[PRIVADO de ${data.fromName}]: ${data.text}`,
          timestamp: Date.now(),
        },
      ]);
      scrollToBottom();
    });

    socketInstance.on("__loly:error", (error: any) => {
      setError(`${error.code}: ${error.message}`);
      console.error("❌ Error:", error);
    });

    return () => {
      socketInstance.close();
    };
  }, []);

  const scrollToBottom = () => {
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, 100);
  };

  const sendMessage = () => {
    if (!socket || !connected || !input.trim()) return;

    socket.emit("message", {
      text: input.trim(),
      roomId: currentRoom || undefined,
    });

    setInput("");
  };

  const joinRoom = (roomId: string) => {
    if (socket && connected) {
      socket.emit("join-room", { roomId });
      setCurrentRoom(roomId);
    }
  };

  const leaveRoom = () => {
    if (socket && connected && currentRoom) {
      socket.emit("leave-room", { roomId: currentRoom });
      setCurrentRoom(null);
    }
  };

  const formatTime = (timestamp: number) => {
    return new Date(timestamp).toLocaleTimeString();
  };

  return (
    <div className="container mx-auto p-8 max-w-6xl">
      <div className="mb-8">
        <h1 className="text-4xl font-bold mb-2">Realtime Chat</h1>
        <p className="text-muted-foreground">
          Demostración de chat con rooms, presence y message history
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>
              Chat {currentRoom && `- Sala: ${currentRoom}`}
            </CardTitle>
            <CardDescription>
              {connected ? "🟢 Conectado" : "🔴 Desconectado"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {error && (
              <div className="p-3 bg-red-100 dark:bg-red-900/20 border border-red-300 dark:border-red-800 rounded text-red-700 dark:text-red-400 text-sm mb-4">
                {error}
              </div>
            )}

            <div className="border rounded-lg p-4 h-96 overflow-y-auto mb-4 bg-muted/50">
              {messages.length === 0 ? (
                <div className="text-center text-muted-foreground py-8">
                  No hay mensajes aún. ¡Envía el primero!
                </div>
              ) : (
                <div className="space-y-2">
                  {messages.map((msg) => (
                    <div
                      key={msg.id}
                      className={cn(
                        "p-2 rounded",
                        msg.type === "system"
                          ? "text-muted-foreground text-sm italic"
                          : "bg-background"
                      )}
                    >
                      {msg.type === "user" && (
                        <span className="font-semibold text-primary">
                          {msg.userName || "Unknown"}:{" "}
                        </span>
                      )}
                      <span>{msg.text}</span>
                      <span className="text-xs text-muted-foreground ml-2">
                        {formatTime(msg.timestamp)}
                      </span>
                    </div>
                  ))}
                  <div ref={messagesEndRef} />
                </div>
              )}
            </div>

            <div className="flex gap-2">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && sendMessage()}
                placeholder="Escribe un mensaje..."
                disabled={!connected}
                className="flex-1 px-4 py-2 border rounded-md disabled:opacity-50"
              />
              <button
                onClick={sendMessage}
                disabled={!connected || !input.trim()}
                className={cn(buttonVariants({ variant: "default" }))}
              >
                Enviar
              </button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Rooms</CardTitle>
            <CardDescription>
              Únete a salas para chats privados
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <button
                onClick={() => joinRoom("general")}
                disabled={!connected || currentRoom === "general"}
                className={cn(buttonVariants({ variant: "outline" }), "w-full")}
              >
                Unirse a "general"
              </button>
              <button
                onClick={() => joinRoom("space")}
                disabled={!connected || currentRoom === "space"}
                className={cn(buttonVariants({ variant: "outline" }), "w-full")}
              >
                Unirse a "space"
              </button>
              {currentRoom && (
                <button
                  onClick={leaveRoom}
                  disabled={!connected}
                  className={cn(buttonVariants({ variant: "destructive" }), "w-full")}
                >
                  Salir de sala
                </button>
              )}
            </div>

            <div className="pt-4 border-t">
              <h3 className="font-semibold mb-2">Características</h3>
              <ul className="space-y-1 text-sm text-muted-foreground">
                <li>✅ Auth hook</li>
                <li>✅ Schema validation</li>
                <li>✅ Guards</li>
                <li>✅ Rate limiting</li>
                <li>✅ Rooms</li>
                <li>✅ Message history</li>
                <li>✅ Presence tracking</li>
              </ul>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
