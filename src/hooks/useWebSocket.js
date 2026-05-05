// ============================================================
//  WhisperBox — WebSocket Hook
//  Real-time messaging with auto-reconnect
// ============================================================

import { useEffect, useRef, useCallback } from 'react';
import { getAccessToken } from '../api/client';

const WS_BASE = 'wss://whisperbox.koyeb.app/ws';
const MAX_RECONNECT_DELAY = 30000;
const BASE_RECONNECT_DELAY = 1000;

export function useWebSocket({ onMessage, onPresence, onError, enabled = true }) {
  const wsRef = useRef(null);
  const reconnectTimeoutRef = useRef(null);
  const reconnectAttemptRef = useRef(0);
  const mountedRef = useRef(true);

  const connect = useCallback(() => {
    if (!mountedRef.current || !enabled) return;

    const token = getAccessToken();
    if (!token) return;

    try {
      const ws = new WebSocket(`${WS_BASE}?token=${token}`);
      wsRef.current = ws;

      ws.onopen = () => {
        reconnectAttemptRef.current = 0;
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.event === 'message.receive') {
            onMessage?.(data);
          } else if (data.event === 'user.online' || data.event === 'user.offline') {
            onPresence?.(data);
          } else if (data.event === 'error') {
            onError?.(data.detail);
          }
        } catch (e) {
          console.warn('WS parse error:', e);
        }
      };

      ws.onclose = () => {
        if (!mountedRef.current) return;
        scheduleReconnect();
      };

      ws.onerror = () => {
        ws.close();
      };
    } catch (e) {
      scheduleReconnect();
    }
  }, [enabled, onMessage, onPresence, onError]);

  const scheduleReconnect = useCallback(() => {
    if (!mountedRef.current) return;
    const delay = Math.min(
      BASE_RECONNECT_DELAY * Math.pow(2, reconnectAttemptRef.current),
      MAX_RECONNECT_DELAY
    );
    reconnectAttemptRef.current++;
    reconnectTimeoutRef.current = setTimeout(connect, delay);
  }, [connect]);

  const send = useCallback((data) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(data));
      return true;
    }
    return false;
  }, []);

  const sendMessage = useCallback((toUserId, payload) => {
    return send({
      event: 'message.send',
      to: toUserId,
      payload,
    });
  }, [send]);

  useEffect(() => {
    mountedRef.current = true;
    if (enabled) connect();

    return () => {
      mountedRef.current = false;
      clearTimeout(reconnectTimeoutRef.current);
      wsRef.current?.close();
    };
  }, [connect, enabled]);

  const isConnected = () => wsRef.current?.readyState === WebSocket.OPEN;

  return { sendMessage, isConnected };
}
