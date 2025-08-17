import { useEffect, useState } from 'react'
import { io, Socket } from 'socket.io-client'

export function useSocket() {
  const [socket, setSocket] = useState<Socket | null>(null)

  useEffect(() => {
    // Gate the socket connection to avoid noisy Engine.IO polling when no server is present
    const enabled = typeof window !== 'undefined' && process.env.NEXT_PUBLIC_ENABLE_SOCKET === 'true'
    if (!enabled) return

    const socketInstance = io({
      path: '/api/socketio',
      // Prefer WebSocket to avoid long-polling spam; fall back can be enabled later if needed
      transports: ['websocket'],
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      timeout: 20000,
    })

    socketInstance.on('connect', () => {
      console.log('Connected to Socket.IO server')
    })

    socketInstance.on('disconnect', () => {
      console.log('Disconnected from Socket.IO server')
    })

    setSocket(socketInstance)

    return () => {
      socketInstance.disconnect()
    }
  }, [])

  return socket
}