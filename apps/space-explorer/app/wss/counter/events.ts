import { defineWssRoute } from "@lolyjs/core";
import { z } from "zod";

/**
 * Counter WebSocket namespace
 * 
 * Demuestra:
 * - State store compartido (funciona en cluster con Redis)
 * - Schema validation
 * - Rate limiting
 * - Presence tracking
 */
export default defineWssRoute({
  onConnect: async (ctx) => {
    // Obtener valor inicial del counter desde state store
    const count = (await ctx.state.get<number>("counter:value")) || 0;
    
    // Enviar estado actual al cliente
    ctx.actions.reply("counter-state", { count });
    
    ctx.log.info("Client connected to counter namespace", {
      socketId: ctx.socket.id,
    });
  },

  onDisconnect: (ctx, reason) => {
    ctx.log.info("Client disconnected from counter namespace", {
      socketId: ctx.socket.id,
      reason,
    });
  },

  events: {
    increment: {
      schema: z.object({
        by: z.number().int().min(1).max(10).default(1).optional(),
      }),
      rateLimit: {
        eventsPerSecond: 5,
        burst: 10,
      },
      handler: async (ctx) => {
        const by = ctx.data.by || 1;
        
        // Incrementar contador en state store (funciona en cluster)
        const newCount = await ctx.state.incr("counter:value", by);
        
        // Broadcast a todos los clientes conectados
        ctx.actions.broadcast("counter-update", {
          count: newCount,
          increment: by,
          timestamp: Date.now(),
        });
        
        ctx.log.debug("Counter incremented", {
          by,
          newCount,
        });
      },
    },

    decrement: {
      schema: z.object({
        by: z.number().int().min(1).max(10).default(1).optional(),
      }),
      rateLimit: {
        eventsPerSecond: 5,
        burst: 10,
      },
      handler: async (ctx) => {
        const by = ctx.data.by || 1;
        
        // Decrementar contador
        const newCount = await ctx.state.decr("counter:value", by);
        
        ctx.actions.broadcast("counter-update", {
          count: newCount,
          decrement: by,
          timestamp: Date.now(),
        });
        
        ctx.log.debug("Counter decremented", {
          by,
          newCount,
        });
      },
    },

    reset: {
      schema: z.object({}),
      handler: async (ctx) => {
        // Resetear contador
        await ctx.state.set("counter:value", 0);
        
        ctx.actions.broadcast("counter-update", {
          count: 0,
          reset: true,
          timestamp: Date.now(),
        });
        
        ctx.log.info("Counter reset");
      },
    },

    "get-users": {
      handler: async (ctx) => {
        // Obtener lista de usuarios conectados usando presence
        // Nota: Esto requiere que los usuarios estén autenticados
        // Por ahora retornamos socket count
        const socketCount = ctx.io.sockets.sockets.size;
        
        ctx.actions.reply("users-list", {
          connected: socketCount,
          timestamp: Date.now(),
        });
      },
    },
  },
});
