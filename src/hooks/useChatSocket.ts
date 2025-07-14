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

  type Outgoing =
    | string                              // normal chat
    | { type: string; [key: string]: any }; // signalling with any type

  const send = (payload: Outgoing) => {
    if (wsRef.current?.readyState !== WebSocket.OPEN) return;

    if (typeof payload === 'string') {
      // chat text → wrap exactly as before
      wsRef.current.send(JSON.stringify({ content: payload }));
    } else {
      // signalling JSON → send as-is
      wsRef.current.send(JSON.stringify(payload));
    }
  };



  return { send };
}