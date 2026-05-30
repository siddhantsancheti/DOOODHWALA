import { useEffect, useRef, useState } from 'react';
import { useAuth } from './useAuth';
import { API_BASE_URL } from '../lib/queryClient';
import * as SecureStore from '../lib/storage';

export interface ChatMessage {
  id: number;
  customerId: number;
  milkmanId: number;
  message: string;
  senderType: 'customer' | 'milkman';
  createdAt: string;
  isRead: boolean;
  isDelivered: boolean;
  isAccepted: boolean;
}

export interface WebSocketMessage {
  type: 'new_message' | 'message_sent' | 'messages_read' | 'authenticated' | 'auth_error' | 'error' | 'order_accepted' | 'order_delivered' | 'service_request_update';
  message?: ChatMessage;
  customerId?: number;
  milkmanId?: number;
  messageId?: number;
  requestId?: number;
  event?: string;
  userId?: string;
  error?: string;
}

export function useWebSocket() {
  const { user } = useAuth();
  const [isConnected, setIsConnected] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const wsRef = useRef<WebSocket | null>(null);
  const messageHandlersRef = useRef<Map<string, (data: WebSocketMessage) => void>>(new Map());

  useEffect(() => {
    if (!user) return;

    // Dynamically derive WebSocket URL from API_BASE_URL
    const host = API_BASE_URL.replace('https://', '').replace('http://', '').replace('/api', '');
    const protocol = API_BASE_URL.startsWith('https') ? 'wss' : 'ws';
    const wsUrl = `${protocol}://${host}/ws`;

    let unmounted = false;
    let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
    let attempts = 0;

    const connect = () => {
      if (unmounted) return;
      console.log(`Connecting to WebSocket: ${wsUrl}`);
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = async () => {
        console.log('WebSocket connected');
        attempts = 0;
        setIsConnected(true);

        // Server verifies the JWT — authenticate with the token, not a raw userId.
        const token =
          (await SecureStore.getItemAsync('token')) ||
          (await SecureStore.getItemAsync('accessToken'));

        if (!token) {
          console.warn('WebSocket: no auth token available, closing connection');
          ws.close();
          return;
        }

        ws.send(JSON.stringify({
          type: 'authenticate',
          token,
          userType: user.userType || 'customer',
        }));
      };

      ws.onmessage = (event) => {
        try {
          const data: WebSocketMessage = JSON.parse(event.data);

          if (data.type === 'new_message' && data.message) {
            setMessages(prev => [...prev, data.message!]);
          } else if (data.type === 'message_sent' && data.message) {
            setMessages(prev => [...prev, data.message!]);
          } else if (data.type === 'order_accepted' && data.messageId) {
            setMessages(prev => prev.map(msg =>
              msg.id === data.messageId ? { ...msg, isAccepted: true } : msg
            ));
          }

          messageHandlersRef.current.forEach(handler => {
            try {
              handler(data);
            } catch (error) {
              console.error('Error in WebSocket message handler:', error);
            }
          });
        } catch (error) {
          console.error('Failed to parse WebSocket message:', error);
        }
      };

      const scheduleReconnect = () => {
        if (unmounted) return;
        setIsConnected(false);
        if (reconnectTimer) clearTimeout(reconnectTimer);
        // Exponential backoff capped at 10s so a dropped socket auto-recovers
        // (network blip, app resume, Render idle) and real-time keeps working.
        const delay = Math.min(1000 * 2 ** attempts, 10000);
        attempts += 1;
        reconnectTimer = setTimeout(connect, delay);
      };

      ws.onclose = () => {
        console.log('WebSocket disconnected — will reconnect');
        scheduleReconnect();
      };

      ws.onerror = () => {
        try { ws.close(); } catch {}
      };
    };

    connect();

    return () => {
      unmounted = true;
      if (reconnectTimer) clearTimeout(reconnectTimer);
      try { wsRef.current?.close(); } catch {}
    };
  }, [user?.id]);

  const sendMessage = (customerId: number, milkmanId: number, message: string, senderType: 'customer' | 'milkman') => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: 'chat_message',
        customerId,
        milkmanId,
        message,
        senderType
      }));
    }
  };

  const markMessagesAsRead = (customerId: number, milkmanId: number, senderType: 'customer' | 'milkman') => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: 'mark_messages_read',
        customerId,
        milkmanId,
        senderType
      }));
    }
  };

  const addMessageHandler = (id: string, handler: (data: WebSocketMessage) => void) => {
    messageHandlersRef.current.set(id, handler);
  };

  const removeMessageHandler = (id: string) => {
    messageHandlersRef.current.delete(id);
  };

  return {
    isConnected,
    messages,
    sendMessage,
    markMessagesAsRead,
    addMessageHandler,
    removeMessageHandler
  };
}
