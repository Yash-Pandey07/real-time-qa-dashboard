import React, { useState } from 'react';

const STATUS_COLORS = {
  success:   '#22c55e',
  failure:   '#ef4444',
  running:   '#60a5fa',
  queued:    '#94a3b8',
  cancelled: '#64748b',
  skipped:   '#475569',
  pending:   '#f59e0b',
  unknown:   '#334155',
};

function fmtDuration(sec) {
  if (!sec) return '—';
  if (sec < 60) return `${sec}s`;
  return `${Math.floor(sec / 60)}m ${sec % 60}s`;
}

function timeAgo(iso) {
  if (!iso) return '—';
  const diff = Math.round((Date.now() - new Date(iso)) / 1000);
  if (diff < 60)   return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  return `${Math.floor(diff / 3600)}h ago`;
}

function Cell({ slot }) {
  const [tooltip, setTooltip] = useState(false);
  const color = STATUS_COLORS[slot.status] || '#334155';

  return (
    <div style={{ position: 'relative', display: 'inline-block' }}>
      <a
        href={slot.url || '#'}
        target="_blank"
        rel="noreferrer"
        onMouseEnter={() => setTooltip(true)}
        onMouseLeave={() => setTooltip(false)}
        style={{
          display: 'block', width: 22, height: 22, borderRadius: 4,
          background: color, cursor: 'pointer', transition: 'transform 0.1s',
          textDecoration: 'none',
        }}
        title={slot.status}
      />
      {tooltip && (
        <div style={{
          position: 'absolute', bottom: 28, left: '50%', transform: 'translateX(-50%)',
          background: '#0f172a', border: '1px solid #334155', borderRadius: 6,
          padding: '8px 10px', fontSize: 11, color: '#e2e8f0', whiteSpace: 'nowrap',
          zIndex: 50, pointerEvents: 'none', minWidth: 140,
        }}>
          <div style={{ fontWeight: 600, color }}>{slot.status.toUpperCase()}</div>
          {slot.branch && <div>Branch: {slot.branch}</div>}
          {slot.commitSha && <div>Commit: {slot.commitSha}</div>}
          {slot.durationSec > 0 && <div>Duration: {fmtDuration(slot.durationSec)}</div>}
          <div>{timeAgo(slot.startedAt)}</div>
        </div>
      )}
    </div>
  );
}

export default function HeatMap({ grid = [] }) {
  if (!grid.length) {
    return (
      <div style={{ textAlign: 'center', color: '#64748b', padding: 60 }}>
        Loading pipeline data...
      </div>
    );
  }

  return (
    <div>
      <h2 style={{ fontSize: 16, fontWeight: 600, marginBottom: 16, color: '#e2e8f0' }}>
        Pipeline Heat Map
        <span style={{ color: '#64748b', fontSize: 12, fontWeight: 400, marginLeft: 8 }}>
          — last 12 runs per repo
        </span>
      </h2>
      <div style={{ background: '#1e293b', borderRadius: 10, border: '1px solid #334155', overflow: 'hidden' }}>
        {/* Legend */}
        <div style={{ display: 'flex', gap: 16, padding: '10px 16px', borderBottom: '1px solid #334155', flexWrap: 'wrap' }}>
          {Object.entries(STATUS_COLORS).map(([status, color]) => (
            <div key={status} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
              <span style={{ width: 10, height: 10, borderRadius: 2, background: color, display: 'inline-block' }} />
              <span style={{ fontSize: 11, color: '#94a3b8', textTransform: 'capitalize' }}>{status}</span>
            </div>
          ))}
        </div>

        {/* Grid */}
        <div>
          {grid.map((row, i) => (
            <div key={row.module} style={{
              display: 'flex', alignItems: 'center', padding: '10px 16px', gap: 12,
              borderBottom: i < grid.length - 1 ? '1px solid #1e293b' : 'none',
            }}>
              {/* Module label */}
              <div style={{ minWidth: 90, fontWeight: 600, fontSize: 13, color: '#e2e8f0' }}>
                {row.module}
              </div>

              {/* Cells */}
              <div style={{ display: 'flex', gap: 4, flex: 1, flexWrap: 'wrap' }}>
                {row.slots.map((slot, j) => <Cell key={slot.runId || j} slot={slot} />)}
                {row.slots.length === 0 && (
                  <span style={{ color: '#475569', fontSize: 12 }}>No runs</span>
                )}
              </div>

              {/* Pass rate bar */}
              <div style={{ minWidth: 120, textAlign: 'right' }}>
                <div style={{ fontSize: 12, color: '#94a3b8', marginBottom: 4 }}>
                  <span style={{ color: '#22c55e', fontWeight: 600 }}>{row.pass}</span>
                  <span style={{ color: '#64748b' }}> / {row.total}</span>
                  <span style={{ marginLeft: 6, color: row.passRate >= 80 ? '#22c55e' : row.passRate >= 60 ? '#f59e0b' : '#ef4444', fontWeight: 700 }}>
                    {row.passRate}%
                  </span>
                </div>
                <div style={{ height: 4, background: '#334155', borderRadius: 2, overflow: 'hidden' }}>
                  <div style={{
                    height: '100%', borderRadius: 2,
                    width: `${row.passRate}%`,
                    background: row.passRate >= 80 ? '#22c55e' : row.passRate >= 60 ? '#f59e0b' : '#ef4444',
                    transition: 'width 0.4s',
                  }} />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
