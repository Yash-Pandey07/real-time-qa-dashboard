import React, { useState, useEffect } from 'react';
import { RefreshCw, Activity, Wifi, WifiOff } from 'lucide-react';

function timeAgo(iso) {
  if (!iso) return '—';
  const diff = Math.round((Date.now() - new Date(iso)) / 1000);
  if (diff < 60)   return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  return `${Math.floor(diff / 3600)}h ago`;
}

export default function Header({ connected, lastUpdated, onRefresh }) {
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  return (
    <header style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '14px 24px', background: '#0f172a',
      borderBottom: '1px solid #1e293b', position: 'sticky', top: 0, zIndex: 100,
    }}>
      {/* Left: logo + live badge */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <Activity size={22} color="#6366f1" />
        <span style={{ fontWeight: 700, fontSize: 17, letterSpacing: '-0.3px' }}>
          QA Dashboard
        </span>
        <span style={{
          background: '#22c55e', color: '#fff', fontSize: 10, fontWeight: 700,
          padding: '2px 7px', borderRadius: 10, letterSpacing: 1,
          animation: 'pulse 2s infinite',
        }}>
          LIVE
        </span>
        <style>{`@keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.6} }`}</style>
      </div>

      {/* Right: last updated, clock, refresh, connection */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
        <span style={{ color: '#64748b', fontSize: 13 }}>
          Updated: <span style={{ color: '#94a3b8' }}>{timeAgo(lastUpdated)}</span>
        </span>

        <span style={{ color: '#94a3b8', fontSize: 13, fontVariantNumeric: 'tabular-nums' }}>
          {now.toLocaleTimeString()}
        </span>

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
              <span style={{
                width: 8, height: 8, borderRadius: '50%', background: '#22c55e',
                boxShadow: '0 0 6px #22c55e', display: 'inline-block',
                animation: 'pulse 2s infinite',
              }} />
              <Wifi size={15} color="#22c55e" />
              <span style={{ color: '#22c55e', fontSize: 12 }}>Live</span>
            </>
          ) : (
            <>
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#ef4444', display: 'inline-block' }} />
              <WifiOff size={15} color="#ef4444" />
              <span style={{ color: '#ef4444', fontSize: 12 }}>Disconnected</span>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
