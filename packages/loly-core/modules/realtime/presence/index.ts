import type { Socket } from "socket.io";
import type { RealtimeStateStore } from "../types";

/**
 * Presence manager for tracking user-to-socket mappings.
 * Used for implementing toUser() targeting.
 */
export class PresenceManager {
  private stateStore: RealtimeStateStore;
  private prefix: string;

  constructor(stateStore: RealtimeStateStore, prefix: string = "loly:rt:") {
    this.stateStore = stateStore;
    this.prefix = prefix;
  }

  /**
   * Add a socket for a user
   */
  async addSocketForUser(userId: string, socketId: string): Promise<void> {
    const key = this.key(`userSockets:${userId}`);
    await this.stateStore.setAdd(key, socketId);
    
    // Also store reverse mapping
    const socketKey = this.key(`socketUser:${socketId}`);
    await this.stateStore.set(socketKey, userId);
  }

  /**
   * Remove a socket for a user
   */
  async removeSocketForUser(userId: string, socketId: string): Promise<void> {
    const key = this.key(`userSockets:${userId}`);
    await this.stateStore.setRem(key, socketId);
    
    // Remove reverse mapping
    const socketKey = this.key(`socketUser:${socketId}`);
    await this.stateStore.del(socketKey);
    
    // Check if user has no more sockets
    const sockets = await this.stateStore.setMembers(key);
    if (sockets.length === 0) {
      await this.stateStore.del(key);
    }
  }

  /**
   * Get all socket IDs for a user
   */
  async getSocketsForUser(userId: string): Promise<string[]> {
    const key = this.key(`userSockets:${userId}`);
    return await this.stateStore.setMembers(key);
  }

  /**
   * Get user ID for a socket
   */
  async getUserForSocket(socketId: string): Promise<string | null> {
    const socketKey = this.key(`socketUser:${socketId}`);
    return await this.stateStore.get<string>(socketKey);
  }

  /**
   * Add user to a room's presence (optional feature)
   */
  async addUserToRoom(namespace: string, room: string, userId: string): Promise<void> {
    const key = this.key(`presence:${namespace}:${room}`);
    await this.stateStore.setAdd(key, userId);
  }

  /**
   * Remove user from a room's presence
   */
  async removeUserFromRoom(namespace: string, room: string, userId: string): Promise<void> {
    const key = this.key(`presence:${namespace}:${room}`);
    await this.stateStore.setRem(key, userId);
    
    // Cleanup if room is empty
    const members = await this.stateStore.setMembers(key);
    if (members.length === 0) {
      await this.stateStore.del(key);
    }
  }

  /**
   * Get all users in a room
   */
  async getUsersInRoom(namespace: string, room: string): Promise<string[]> {
    const key = this.key(`presence:${namespace}:${room}`);
    return await this.stateStore.setMembers(key);
  }

  /**
   * Add prefix to key
   */
  private key(key: string): string {
    return `${this.prefix}${key}`;
  }
}
