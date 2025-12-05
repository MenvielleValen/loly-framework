import { WssContext } from "@lolyjs/core";

/**
 * WebSocket event handlers for the chat namespace.
 * 
 * These handlers are automatically registered by the framework when a client
 * connects to the '/chat' namespace.
 * 
 * Features:
 * - User registration with name
 * - Public chat messages
 * - Private messages between users
 * - Connected users list
 * - User join/leave notifications
 * - Message persistence in memory
 */

type ChatMessage = {
  text: string;
  fromClientId: string;
  fromName: string;
  toClientId: string;
  at: number;
};

// Store connected users: socketId -> { clientId, name }
const connectedUsers = new Map<string, { clientId: string; name: string }>();

// Store socket reference for quick lookup: clientId -> socketId
const clientIdToSocketId = new Map<string, string>();

// Store private messages: conversationKey -> ChatMessage[]
// Conversation key is a sorted combination of both clientIds to ensure bidirectional lookup
const privateMessages = new Map<string, ChatMessage[]>();

// Helper function to create a conversation key (sorted clientIds)
function getConversationKey(clientId1: string, clientId2: string): string {
  return [clientId1, clientId2].sort().join("::");
}

// Helper function to get all connected users
function getConnectedUsersList() {
  return Array.from(connectedUsers.values()).map(({ clientId, name }) => ({
    clientId,
    name,
  }));
}

// Helper function to broadcast updated user list to all clients
function broadcastUserList(ctx: WssContext) {
  const users = getConnectedUsersList();
  ctx.actions.emit("users-list", users);
}

// Helper function to store a private message
function storePrivateMessage(message: ChatMessage) {
  const conversationKey = getConversationKey(message.fromClientId, message.toClientId);
  const messages = privateMessages.get(conversationKey) || [];
  messages.push(message);
  privateMessages.set(conversationKey, messages);
}

// Helper function to get chat history
function getChatHistory(clientId1: string, clientId2: string): ChatMessage[] {
  const conversationKey = getConversationKey(clientId1, clientId2);
  return privateMessages.get(conversationKey) || [];
}

export const events = [
  {
    name: "connection",
    handler: (ctx: WssContext) => {
      console.log("Client connected to chat namespace:", ctx.socket.id);
      
      // Handle disconnection
      ctx.socket.on("disconnect", () => {
        const user = connectedUsers.get(ctx.socket.id);
        if (user) {
          console.log(`User disconnected: ${user.name} (${user.clientId})`);
          
          // Remove from maps
          connectedUsers.delete(ctx.socket.id);
          clientIdToSocketId.delete(user.clientId);
          
          // Notify all clients that user left
          ctx.actions.broadcast("user-left", {
            clientId: user.clientId,
            name: user.name,
          });
          
          // Broadcast updated user list
          broadcastUserList(ctx);
        }
      });
    },
  },
  {
    name: "register",
    handler: (ctx: WssContext) => {
      const { socket, data, actions } = ctx;
      const { clientId, name } = data;

      if (!clientId || !name || typeof name !== "string" || name.trim().length === 0) {
        // Send error back to client
        socket.emit("error", {
          message: "clientId and name are required",
        });
        return;
      }

      const trimmedName = name.trim();

      // Check if clientId already exists
      if (clientIdToSocketId.has(clientId)) {
        socket.emit("error", {
          message: "clientId already registered",
        });
        return;
      }

      // Store user information
      connectedUsers.set(socket.id, {
        clientId,
        name: trimmedName,
      });

      clientIdToSocketId.set(clientId, socket.id);

      // Store clientId in socket data for later retrieval
      (socket as any).data = { ...(socket as any).data, clientId, name: trimmedName };

      console.log(`User registered: ${trimmedName} (${clientId})`);

      // Notify the user of successful registration
      socket.emit("registered", {
        clientId,
        name: trimmedName,
        socketId: socket.id,
      });

      // Broadcast new user to all clients
      actions.broadcast("user-joined", {
        clientId,
        name: trimmedName,
      });

      // Send updated user list to all clients
      broadcastUserList(ctx);
    },
  },
  {
    name: "chat",
    handler: (ctx: WssContext) => {
      const { socket, data, actions } = ctx;

      if (!data.text || !data.fromClientId) {
        return;
      }

      // Find user by socket ID
      const user = connectedUsers.get(socket.id);

      if (!user || user.clientId !== data.fromClientId) {
        socket.emit("error", {
          message: "User not registered or clientId mismatch",
        });
        return;
      }

      const payload = {
        type: "chat",
        text: data.text,
        fromClientId: data.fromClientId,
        fromName: user.name,
        at: data.at ?? Date.now(),
      };

      // Broadcast the message to all clients in the namespace
      actions.emit("chat", payload);
    },
  },
  {
    name: "private-message",
    handler: (ctx: WssContext) => {
      const { socket, data, actions } = ctx;
      const { toClientId, fromClientId, text } = data;

      if (!toClientId || !fromClientId || !text) {
        socket.emit("error", {
          message: "toClientId, fromClientId, and text are required",
        });
        return;
      }

      // Find sender
      const sender = connectedUsers.get(socket.id);

      if (!sender || sender.clientId !== fromClientId) {
        socket.emit("error", {
          message: "User not registered or clientId mismatch",
        });
        return;
      }

      const payload: ChatMessage = {
        text,
        fromClientId,
        fromName: sender.name,
        toClientId,
        at: data.at ?? Date.now(),
      };

      // Store the message in memory
      storePrivateMessage(payload);

      // Find recipient socket ID
      const recipientSocketId = clientIdToSocketId.get(toClientId);

      if (recipientSocketId) {
        // Send private message to recipient if they're online
        actions.emitTo(recipientSocketId, "private-message", payload);
      }
      // Note: We still store the message even if recipient is offline
      // They'll receive it when they request chat history

      // Also send a copy to sender (for UI confirmation)
      socket.emit("private-message-sent", payload);
    },
  },
  {
    name: "get-chat-history",
    handler: (ctx: WssContext) => {
      const { socket, data } = ctx;
      const { otherClientId } = data;

      // Find current user
      const user = connectedUsers.get(socket.id);

      if (!user) {
        socket.emit("error", {
          message: "User not registered",
        });
        return;
      }

      if (!otherClientId) {
        socket.emit("error", {
          message: "otherClientId is required",
        });
        return;
      }

      // Get chat history for this conversation
      const history = getChatHistory(user.clientId, otherClientId);

      // Send history to client
      socket.emit("chat-history", {
        otherClientId,
        messages: history,
      });
    },
  },
  {
    name: "get-users",
    handler: (ctx: WssContext) => {
      const { socket } = ctx;
      // Send user list to requesting client
      const users = getConnectedUsersList();
      socket.emit("users-list", users);
    },
  },
  {
    name: "disconnect",
    handler: (ctx: WssContext) => {
      // This is handled in the connection handler's disconnect listener
      // Keeping this for compatibility but it won't receive socket context
      console.log("Disconnect event triggered");
    },
  },
];
