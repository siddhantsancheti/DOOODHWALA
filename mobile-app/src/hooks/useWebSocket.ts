import { useEffect, useRef, useState } from 'react';
import { useAuth } from './useAuth';
import { API_BASE_URL } from '../lib/queryClient';

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

    // Dynamically derive WebSocket URL from API_BASE_URL
    const host = API_BASE_URL.replace('https://', '').replace('http://', '').replace('/api', '');
    const protocol = API_BASE_URL.startsWith('https') ? 'wss' : 'ws';
    const wsUrl = `${protocol}://${host}/ws`;
    
    console.log(`Connecting to WebSocket: ${wsUrl}`);
    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      console.log('WebSocket connected');
      setIsConnected(true);
      
      const numericId = user.id?.includes('_') ? user.id.split('_').pop() : user.id;
      
      ws.send(JSON.stringify({
        type: 'authenticate',
        userId: numericId,
        userType: user.userType || 'customer'
      }));
    };

    ws.onmessage = (event) => {
      try {
        const data: WebSocketMessage = JSON.parse(event.data);
        console.log('WebSocket message received:', data);
        
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
