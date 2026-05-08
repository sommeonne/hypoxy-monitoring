import { useRef, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';

let socket: Socket | null = null;

function getSocket(): Socket {
  if (!socket) {
    socket = io(window.location.origin, { transports: ['websocket', 'polling'] });
  }
  return socket;
}

export function useSocket() {
  const socketRef = useRef<Socket>(getSocket());

  const on = useCallback((event: string, handler: (...args: any[]) => void) => {
    socketRef.current.on(event, handler);
    return () => { socketRef.current.off(event, handler); };
  }, []);

  const joinSession = useCallback((sessionId: string) => {
    socketRef.current.emit('join:session', sessionId);
  }, []);

  const leaveSession = useCallback((sessionId: string) => {
    socketRef.current.emit('leave:session', sessionId);
  }, []);

  return { socket: socketRef.current, on, joinSession, leaveSession };
}
