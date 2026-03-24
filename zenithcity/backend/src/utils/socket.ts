import { Server as SocketServer } from 'socket.io';

let io: SocketServer | null = null;

export function setSocketInstance(socketInstance: SocketServer): void {
  io = socketInstance;
}

export function getSocketInstance(): SocketServer | null {
  return io;
}

export function emitToUser(userId: string, event: string, data: any): void {
  if (io) {
    io.to(`user:${userId}`).emit(event, data);
  }
}