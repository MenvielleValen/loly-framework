import { defineWssRoute } from "@lolyjs/core";
import { z } from "zod";

/**
 * Chat WebSocket namespace
 * 
 * Demuestra:
 * - Auth hook (simulado)
 * - Schema validation
 * - Guards
 * - Rooms
 * - Broadcast
 * - Message history con state store
 */
export default defineWssRoute({
  // Auth hook simulado (en producción usarías JWT, session, etc.)
  auth: async (ctx) => {
    // Simular autenticación desde header o cookie
    const authHeader = ctx.req.headers.authorization;
    const userId = (authHeader as string)?.replace("Bearer ", "") || `guest-${ctx.socket.id.slice(0, 8)}`;
    
    // En producción, verificarías el token y obtendrías el usuario real
    return {
      id: userId,
      name: userId.startsWith("guest-") ? `Guest ${userId.slice(6)}` : `User ${userId}`,
      role: userId.startsWith("admin-") ? "admin" : "user",
    };
  },

  onConnect: async (ctx) => {
    const userName = ctx.user?.name || "Unknown";
    
    // Agregar mensaje de bienvenida al historial
    await ctx.state.listPush("chat:messages", {
      type: "system",
      message: `${userName} se unió al chat`,
      timestamp: Date.now(),
    }, { maxLen: 50 }); // Mantener últimos 50 mensajes

    // Notificar a otros usuarios
    ctx.actions.broadcast("user-joined", {
      userId: ctx.user?.id,
      userName,
      timestamp: Date.now(),
    });

    // Enviar historial reciente al nuevo usuario
    const recentMessages = await ctx.state.listRange("chat:messages", 0, 20);
    ctx.actions.reply("chat-history", {
      messages: recentMessages,
    });

    ctx.log.info("User joined chat", {
      userId: ctx.user?.id,
      userName,
    });
  },

  onDisconnect: (ctx, reason) => {
    const userName = ctx.user?.name || "Unknown";
    
    // Notificar desconexión (async, no esperamos)
    ctx.actions.broadcast("user-left", {
      userId: ctx.user?.id,
      userName,
      timestamp: Date.now(),
    }).catch(() => {}); // Ignorar errores si ya desconectó

    ctx.log.info("User left chat", {
      userId: ctx.user?.id,
      userName,
      reason,
    });
  },

  events: {
    message: {
      schema: z.object({
        text: z.string().min(1).max(500),
        roomId: z.string().optional(),
      }),
      guard: ({ user }) => !!user, // Requiere autenticación
      rateLimit: {
        eventsPerSecond: 10,
        burst: 20,
      },
      handler: async (ctx) => {
        const message = {
          id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          userId: ctx.user?.id,
          userName: ctx.user?.name,
          text: ctx.data.text,
          timestamp: Date.now(),
        };

        // Guardar en historial
        await ctx.state.listPush("chat:messages", message, { maxLen: 50 });

        // Si hay roomId, enviar al room, sino broadcast a todos
        if (ctx.data.roomId) {
          ctx.actions.toRoom(ctx.data.roomId).emit("message", message);
        } else {
          ctx.actions.broadcast("message", message);
        }

        ctx.log.debug("Message sent", {
          userId: ctx.user?.id,
          roomId: ctx.data.roomId,
        });
      },
    },

    "join-room": {
      schema: z.object({
        roomId: z.string().min(1),
      }),
      guard: ({ user }) => !!user,
      handler: async (ctx) => {
        await ctx.actions.join(ctx.data.roomId);
        
        // Notificar al room
        ctx.actions.toRoom(ctx.data.roomId).emit("user-joined-room", {
          userId: ctx.user?.id,
          userName: ctx.user?.name,
          roomId: ctx.data.roomId,
          timestamp: Date.now(),
        });

        ctx.log.info("User joined room", {
          userId: ctx.user?.id,
          roomId: ctx.data.roomId,
        });
      },
    },

    "leave-room": {
      schema: z.object({
        roomId: z.string().min(1),
      }),
      guard: ({ user }) => !!user,
      handler: async (ctx) => {
        await ctx.actions.leave(ctx.data.roomId);
        
        ctx.actions.toRoom(ctx.data.roomId).emit("user-left-room", {
          userId: ctx.user?.id,
          userName: ctx.user?.name,
          roomId: ctx.data.roomId,
          timestamp: Date.now(),
        });

        ctx.log.info("User left room", {
          userId: ctx.user?.id,
          roomId: ctx.data.roomId,
        });
      },
    },

    "private-message": {
      schema: z.object({
        toUserId: z.string().min(1),
        text: z.string().min(1).max(500),
      }),
      guard: ({ user }) => !!user,
      handler: (ctx) => {
        // Enviar mensaje privado usando toUser (funciona en cluster)
        ctx.actions.toUser(ctx.data.toUserId).emit("private-message", {
          from: ctx.user?.id,
          fromName: ctx.user?.name,
          text: ctx.data.text,
          timestamp: Date.now(),
        });

        // Confirmar al emisor
        ctx.actions.reply("private-message-sent", {
          to: ctx.data.toUserId,
          timestamp: Date.now(),
        });

        ctx.log.debug("Private message sent", {
          from: ctx.user?.id,
          to: ctx.data.toUserId,
        });
      },
    },
  },
});
