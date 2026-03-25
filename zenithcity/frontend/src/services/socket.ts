import { io, Socket } from 'socket.io-client';

let socket: Socket | null = null;

export function connectSocket(userId: string): Socket {
  if (socket?.connected) return socket;

  const socketUrl = import.meta.env.VITE_SOCKET_URL || window.location.origin;

  socket = io(socketUrl, {
    auth: { userId },
    transports: ['websocket', 'polling'],
  });

  socket.on('connect', () => console.log('Socket connected'));
  socket.on('disconnect', () => console.log('Socket disconnected'));

  return socket;
}

export function getSocket(): Socket | null {
  return socket;
}

export function disconnectSocket(): void {
  socket?.disconnect();
  socket = null;
}
