// src/hooks/useChatSocket.ts
import { useEffect, useRef } from 'react';
import Api from '../services/api';

export interface ChatMessage {
  id: number;
  sender_id: number;
  receiver_id: number;
  content: string;
  created_at: string;
  is_read: boolean;
}

export default function useChatSocket(
  partnerId: number,
  onMessage: (msg: ChatMessage) => void,
) {
  const wsRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    let isMounted = true;

    (async () => {
      const token = await Api.getToken();
      const url = `${Api.baseWS}/api/chat/ws/${partnerId}?token=${token}`;

      const ws = new WebSocket(url);
      wsRef.current = ws;

      ws.onmessage = (ev) => {
        if (!isMounted) return;
        const data: ChatMessage = JSON.parse(ev.data);
        onMessage(data);
      };

      ws.onerror = console.warn;
    })();

    return () => {
      isMounted = false;
      wsRef.current?.close();
    };
  }, [partnerId]);

  const send = (content: string) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ content }));
    }
  };

  return { send };
}