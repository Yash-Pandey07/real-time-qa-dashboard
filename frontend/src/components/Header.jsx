import React, { useState, useEffect } from 'react';
import { RefreshCw, Activity, Wifi, WifiOff } from 'lucide-react';

function timeAgo(iso) {
  if (!iso) return '—';
  const diff = Math.round((Date.now() - new Date(iso)) / 1000);
  if (diff < 60)   return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  return `${Math.floor(diff / 3600)}h ago`;
}

function LiveClock() {
  const [time, setTime] = useState(() => new Date().toLocaleTimeString());
  useEffect(() => {
    const t = setInterval(() => setTime(new Date().toLocaleTimeString()), 1000);
    return () => clearInterval(t);
  }, []);
  return <span style={{ color: '#94a3b8', fontSize: 13, fontVariantNumeric: 'tabular-nums' }}>{time}</span>;
}

export default function Header({ connected, lastUpdated, onRefresh }) {
  return (
    <header style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '14px 24px', background: '#0f172a',
      borderBottom: '1px solid #1e293b', position: 'sticky', top: 0, zIndex: 100,
    }}>
      {/* Left: logo + connection badge */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <Activity size={22} color="#6366f1" />
        <span style={{ fontWeight: 700, fontSize: 17, letterSpacing: '-0.3px' }}>
          QA Intelligence Dashboard
        </span>
        {connected ? (
          <span style={{
            background: '#22c55e20', color: '#22c55e', border: '1px solid #22c55e40',
            fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 10, letterSpacing: 1,
            animation: 'livePulse 2s infinite',
          }}>
            ● LIVE
          </span>
        ) : (
          <span style={{
            background: '#f59e0b20', color: '#f59e0b', border: '1px solid #f59e0b40',
            fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 10, letterSpacing: 1,
          }}>
            ● RECONNECTING
          </span>
        )}
        <style>{`@keyframes livePulse { 0%,100%{opacity:1} 50%{opacity:0.55} }`}</style>
      </div>

      {/* Right: last updated, clock, refresh, connection */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
        <span style={{ color: '#64748b', fontSize: 13 }}>
          Updated: <span style={{ color: '#94a3b8' }}>{timeAgo(lastUpdated)}</span>
        </span>

        <LiveClock />

        <button
          onClick={onRefresh}
          style={{
            display: 'flex', alignItems: 'center', gap: 6,
            background: '#1e293b', border: '1px solid #334155',
            color: '#94a3b8', padding: '6px 12px', borderRadius: 6,
            cursor: 'pointer', fontSize: 13,
          }}
        >
          <RefreshCw size={13} />
          Refresh
        </button>

        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          {connected ? (
            <>
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#22c55e', boxShadow: '0 0 6px #22c55e', display: 'inline-block', animation: 'livePulse 2s infinite' }} />
              <Wifi size={15} color="#22c55e" />
              <span style={{ color: '#22c55e', fontSize: 12 }}>Live</span>
            </>
          ) : (
            <>
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#f59e0b', display: 'inline-block' }} />
              <WifiOff size={15} color="#f59e0b" />
              <span style={{ color: '#f59e0b', fontSize: 12 }}>Reconnecting…</span>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
