import { useEffect, useRef, useState } from 'react';
import { useAuth } from './useAuth';

export interface ChatMessage {
  id: number;
  customerId: number;
  milkmanId: number;
  message: string;
  senderType: 'customer' | 'milkman';
  timestamp: Date;
  isRead: boolean;
  isDelivered: boolean;
  isAccepted: boolean;
}

export interface WebSocketMessage {
  type: 'new_message' | 'message_sent' | 'messages_read' | 'authenticated' | 'error' | 'order_accepted';
  message?: ChatMessage;
  customerId?: number;
  milkmanId?: number;
  messageId?: number;
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

    // Build WebSocket URL - works for web and mobile via Capacitor
    const getWebSocketUrl = () => {
      // For mobile apps via Capacitor, use environment variable or construct from API URL
      const mobileApiUrl = (window as any).__MOBILE_API_URL__ || import.meta.env.VITE_WEBSOCKET_URL;
      if (mobileApiUrl) {
        return mobileApiUrl.replace(/^https?/, mobileApiUrl.startsWith('https') ? 'wss' : 'ws');
      }
      
      // For web browsers, use current location
      const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
      return `${protocol}//${window.location.host}/ws`;
    };
    
    const wsUrl = getWebSocketUrl();
    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      console.log('WebSocket connected');
      setIsConnected(true);
      
      // Authenticate the user with proper ID format
      // Extract numeric ID from user.id (e.g., "user_milkman_1" -> "1")
      const numericId = (user as any).id?.includes('_') ? (user as any).id.split('_').pop() : (user as any).id;
      
      ws.send(JSON.stringify({
        type: 'authenticate',
        userId: numericId,
        userType: (user as any).userType || 'customer'
      }));
    };

    ws.onmessage = (event) => {
      try {
        const data: WebSocketMessage = JSON.parse(event.data);
        console.log('WebSocket message received:', data);
        
        // Handle different message types
        if (data.type === 'new_message' && data.message) {
          setMessages(prev => [...prev, data.message!]);
        } else if (data.type === 'message_sent' && data.message) {
          setMessages(prev => [...prev, data.message!]);
        } else if (data.type === 'order_accepted' && data.messageId) {
          // Update the message as accepted
          setMessages(prev => prev.map(msg => 
            msg.id === data.messageId ? { ...msg, isAccepted: true } : msg
          ));
        }
        
        // Call registered handlers
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

    ws.onclose = () => {
      console.log('WebSocket disconnected');
      setIsConnected(false);
    };

    ws.onerror = (error) => {
      console.error('WebSocket error:', error);
      setIsConnected(false);
    };

    return () => {
      ws.close();
    };
  }, [user]);

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