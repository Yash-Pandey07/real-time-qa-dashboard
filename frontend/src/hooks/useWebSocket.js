import { useEffect, useRef, useCallback } from 'react';

function buildWsUrl() {
  if (import.meta.env.VITE_WS_URL) return import.meta.env.VITE_WS_URL;
  const proto = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  const port  = window.location.port ? `:${window.location.port}` : '';
  return `${proto}//${window.location.hostname}${port}/ws`;
}

const WS_URL = buildWsUrl();

export function useWebSocket(handlers) {
  const wsRef       = useRef(null);
  const handlersRef = useRef(handlers);
  const retryRef    = useRef(0);
  const timerRef    = useRef(null);

  useEffect(() => { handlersRef.current = handlers; }, [handlers]);

  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) return;
    const ws = new WebSocket(WS_URL);
    wsRef.current = ws;

    ws.onopen = () => {
      retryRef.current = 0;
      handlersRef.current?.onConnectionChange?.(true);
      const ping = setInterval(() => {
        if (ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify({ type: 'ping' }));
        else clearInterval(ping);
      }, 25000);
    };

    ws.onmessage = (evt) => {
      try {
        const { type, payload } = JSON.parse(evt.data);
        handlersRef.current?.onMessage?.(type, payload);
      } catch {}
    };

    ws.onclose = () => {
      handlersRef.current?.onConnectionChange?.(false);
      const delay = Math.min(1000 * 2 ** retryRef.current, 30000);
      retryRef.current++;
      timerRef.current = setTimeout(connect, delay);
    };

    ws.onerror = () => { ws.close(); };
  }, []);

  useEffect(() => {
    connect();
    return () => { clearTimeout(timerRef.current); wsRef.current?.close(); };
  }, [connect]);
}
