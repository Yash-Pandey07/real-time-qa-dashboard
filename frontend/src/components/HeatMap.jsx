import React, { useState, useMemo } from 'react';
import { createPortal } from 'react-dom';

const STATUS_COLORS = {
  success:   '#22c55e',
  failure:   '#ef4444',
  running:   '#60a5fa',
  queued:    '#94a3b8',
  cancelled: '#64748b',
  skipped:   '#475569',
  pending:   '#f59e0b',
  unknown:   '#1e293b',
};

const TREND_CONFIG = {
  improving: { icon: '↑', color: '#22c55e', label: 'Improving' },
  degrading:  { icon: '↓', color: '#ef4444', label: 'Degrading'  },
  stable:     { icon: '→', color: '#94a3b8', label: 'Stable'     },
  neutral:    { icon: '—', color: '#475569', label: 'No data'    },
};

function fmtDuration(sec) {
  if (!sec || sec === 0) return '—';
  if (sec < 60) return `${sec}s`;
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return s > 0 ? `${m}m ${s}s` : `${m}m`;
}

function timeAgo(iso) {
  if (!iso) return '—';
  const diff = Math.round((Date.now() - new Date(iso)) / 1000);
  if (diff < 60)    return `${diff}s ago`;
  if (diff < 3600)  return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

function CellTooltip({ slot, anchorRect }) {
  if (!anchorRect) return null;
  const color = STATUS_COLORS[slot.status] || STATUS_COLORS.unknown;

  const tooltipWidth = 200;
  let left = anchorRect.left + anchorRect.width / 2 - tooltipWidth / 2;
  // keep within viewport
  left = Math.max(8, Math.min(left, window.innerWidth - tooltipWidth - 8));
  const spaceAbove = anchorRect.top;
  const showBelow  = spaceAbove < 160;
  const top = showBelow
    ? anchorRect.bottom + 8
    : anchorRect.top - 8;
  const transform = showBelow ? 'translateY(0)' : 'translateY(-100%)';

  return createPortal(
    <div style={{
      position: 'fixed', left, top, transform,
      width: tooltipWidth,
      background: '#0f172a',
      border: `1px solid ${color}44`,
      borderRadius: 8,
      padding: '10px 12px',
      fontSize: 12,
      color: '#e2e8f0',
      zIndex: 99999,
      pointerEvents: 'none',
      boxShadow: '0 8px 24px rgba(0,0,0,0.6)',
    }}>
      <div style={{ fontWeight: 700, color, marginBottom: 6, fontSize: 13 }}>
        {slot.status.toUpperCase()}
      </div>
      {slot.name      && <Row label="Workflow" value={slot.name} mono={false} />}
      {slot.branch    && <Row label="Branch"   value={slot.branch} />}
      {slot.commitSha && <Row label="Commit"   value={slot.commitSha} mono />}
      {slot.actor     && <Row label="Actor"    value={slot.actor} />}
      {slot.durationSec > 0 && <Row label="Duration" value={fmtDuration(slot.durationSec)} />}
      <Row label="Started" value={timeAgo(slot.startedAt)} />
      {slot.url && (
        <div style={{ marginTop: 6, fontSize: 11, color: '#6366f1' }}>Click cell to open ↗</div>
      )}
    </div>,
    document.body
  );
}

function Row({ label, value, mono }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, marginBottom: 3 }}>
      <span style={{ color: '#64748b', flexShrink: 0 }}>{label}</span>
      <span style={{ color: '#e2e8f0', fontFamily: mono ? 'monospace' : 'inherit', textAlign: 'right', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{value}</span>
    </div>
  );
}

function Cell({ slot }) {
  const [anchorRect, setAnchorRect] = useState(null);
  const color = STATUS_COLORS[slot.status] || STATUS_COLORS.unknown;

  return (
    <div style={{ position: 'relative', display: 'inline-block' }}>
      <a
        href={slot.url || '#'}
        target="_blank"
        rel="noreferrer"
        onMouseEnter={e => setAnchorRect(e.currentTarget.getBoundingClientRect())}
        onMouseLeave={() => setAnchorRect(null)}
        style={{
          display:       'block',
          width:         20,
          height:        20,
          borderRadius:  4,
          background:    color,
          cursor:        'pointer',
          border:        anchorRect ? '2px solid rgba(255,255,255,0.5)' : '2px solid transparent',
          transition:    'transform 0.1s, border-color 0.1s',
          transform:     anchorRect ? 'scale(1.25)' : 'scale(1)',
          textDecoration: 'none',
        }}
      />
      <CellTooltip slot={slot} anchorRect={anchorRect} />
    </div>
  );
}

function RecentFailures({ failures }) {
  if (!failures?.length) return null;
  return (
    <div style={{ marginTop: 10 }}>
      <div style={{ fontSize: 11, color: '#64748b', marginBottom: 8, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
        Recent Failures
      </div>
      {failures.map((f, i) => (
        <div key={i} style={{
          display: 'flex', alignItems: 'center', gap: 12,
          padding: '7px 0',
          borderTop: '1px solid #1e293b',
        }}>
          <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#ef4444', flexShrink: 0 }} />
          <span style={{ fontFamily: 'monospace', fontSize: 12, color: '#94a3b8', minWidth: 52 }}>{f.commitSha || '—'}</span>
          <span style={{ fontSize: 12, color: '#64748b', minWidth: 80, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{f.branch || '—'}</span>
          <span style={{ fontSize: 12, color: '#475569', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{f.name || ''}</span>
          <span style={{ fontSize: 12, color: '#64748b', flexShrink: 0 }}>{fmtDuration(f.durationSec)}</span>
          <span style={{ fontSize: 12, color: '#475569', flexShrink: 0, minWidth: 60, textAlign: 'right' }}>{timeAgo(f.startedAt)}</span>
          {f.url && (
            <a href={f.url} target="_blank" rel="noreferrer" style={{ fontSize: 12, color: '#6366f1', textDecoration: 'none', flexShrink: 0 }}>↗</a>
          )}
        </div>
      ))}
    </div>
  );
}

function RepoRow({ row, isLast }) {
  const [expanded, setExpanded] = useState(false);
  const trend = TREND_CONFIG[row.trend] || TREND_CONFIG.neutral;
  const hasFailures = row.recentFailures?.length > 0;

  const topWorkflows = useMemo(() => {
    if (!row.workflowCounts) return [];
    return Object.entries(row.workflowCounts).sort((a, b) => b[1] - a[1]).slice(0, 3);
  }, [row.workflowCounts]);

  return (
    <div style={{ borderBottom: isLast ? 'none' : '1px solid #334155' }}>
      {/* Main row */}
      <div style={{ display: 'flex', alignItems: 'center', padding: '16px 20px', gap: 16, flexWrap: 'wrap' }}>

        {/* Repo label */}
        <div style={{ minWidth: 96, maxWidth: 96 }}>
          <div style={{ fontWeight: 700, fontSize: 14, color: '#e2e8f0' }}>{row.module}</div>
          <div style={{ fontSize: 11, color: '#475569', marginTop: 3 }}>{row.total} runs</div>
        </div>

        {/* Cell grid */}
        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', flex: 1, minWidth: 220, alignItems: 'center' }}>
          {row.slots.map((slot, j) => (
            <Cell key={slot.runId || j} slot={slot} />
          ))}
          {row.slots.length === 0 && (
            <span style={{ color: '#475569', fontSize: 13 }}>No runs available</span>
          )}
        </div>

        {/* Right-side stats */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 20, flexShrink: 0 }}>

          {/* Trend */}
          <div style={{ textAlign: 'center', minWidth: 60 }}>
            <div style={{ fontSize: 22, color: trend.color, lineHeight: 1, fontWeight: 700 }}>{trend.icon}</div>
            <div style={{ fontSize: 11, color: '#64748b', marginTop: 4 }}>{trend.label}</div>
          </div>

          {/* Avg duration */}
          <div style={{ textAlign: 'center', minWidth: 60 }}>
            <div style={{ fontSize: 14, fontWeight: 600, color: '#e2e8f0' }}>{fmtDuration(row.avgDuration)}</div>
            <div style={{ fontSize: 11, color: '#64748b', marginTop: 4 }}>avg duration</div>
          </div>

          {/* Pass / fail counts */}
          <div style={{ textAlign: 'center', minWidth: 52 }}>
            <div style={{ fontSize: 13, fontWeight: 600 }}>
              <span style={{ color: '#22c55e' }}>{row.pass}</span>
              <span style={{ color: '#475569', margin: '0 3px' }}>/</span>
              <span style={{ color: '#ef4444' }}>{row.fail}</span>
            </div>
            <div style={{ fontSize: 11, color: '#64748b', marginTop: 4 }}>pass / fail</div>
          </div>

          {/* Pass rate bar */}
          <div style={{ minWidth: 110 }}>
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 6 }}>
              <span style={{
                fontSize: 15, fontWeight: 700,
                color: row.passRate >= 80 ? '#22c55e' : row.passRate >= 60 ? '#f59e0b' : '#ef4444',
              }}>
                {row.passRate}%
              </span>
            </div>
            <div style={{ height: 6, background: '#0f172a', borderRadius: 3, overflow: 'hidden' }}>
              <div style={{
                height: '100%', borderRadius: 3,
                width: `${row.passRate}%`,
                background: row.passRate >= 80 ? '#22c55e' : row.passRate >= 60 ? '#f59e0b' : '#ef4444',
                transition: 'width 0.5s ease',
              }} />
            </div>
          </div>

          {/* Expand toggle — always rendered to keep layout stable */}
          {hasFailures ? (
            <button
              onClick={() => setExpanded(e => !e)}
              style={{
                background: expanded ? '#1e293b' : 'none',
                border: '1px solid #334155',
                borderRadius: 5,
                color: expanded ? '#e2e8f0' : '#94a3b8',
                fontSize: 12,
                cursor: 'pointer',
                padding: '5px 12px',
                whiteSpace: 'nowrap',
                minWidth: 90,
                transition: 'all 0.15s',
              }}
            >
              {expanded ? '▲ Hide' : `▼ ${row.recentFailures.length} failure${row.recentFailures.length > 1 ? 's' : ''}`}
            </button>
          ) : (
            <div style={{
              minWidth: 90,
              fontSize: 12,
              color: '#22c55e',
              padding: '5px 12px',
              border: '1px solid #22c55e22',
              borderRadius: 5,
              textAlign: 'center',
              whiteSpace: 'nowrap',
            }}>
              0 failures
            </div>
          )}
        </div>
      </div>

      {/* Expanded: workflows + recent failures */}
      {expanded && (
        <div style={{ padding: '4px 20px 16px 132px', background: '#161f2e' }}>
          {topWorkflows.length > 0 && (
            <div style={{ display: 'flex', gap: 8, marginBottom: 10, flexWrap: 'wrap' }}>
              <span style={{ fontSize: 11, color: '#475569', alignSelf: 'center' }}>Workflows:</span>
              {topWorkflows.map(([name, count]) => (
                <span key={name} style={{
                  fontSize: 11, color: '#94a3b8',
                  background: '#0f172a',
                  border: '1px solid #334155',
                  borderRadius: 4,
                  padding: '3px 8px',
                }}>
                  {name} <span style={{ color: '#475569' }}>×{count}</span>
                </span>
              ))}
            </div>
          )}
          <RecentFailures failures={row.recentFailures} />
        </div>
      )}
    </div>
  );
}

export default function HeatMap({ grid = [] }) {
  const summary = useMemo(() => {
    if (!grid.length) return null;
    const totalRuns  = grid.reduce((s, r) => s + r.total, 0);
    const totalPass  = grid.reduce((s, r) => s + r.pass, 0);
    const totalFail  = grid.reduce((s, r) => s + r.fail, 0);
    const overallRate = totalRuns ? Math.round(totalPass / totalRuns * 100) : 0;
    const degrading  = grid.filter(r => r.trend === 'degrading').length;
    const improving  = grid.filter(r => r.trend === 'improving').length;
    return { totalRuns, totalPass, totalFail, overallRate, degrading, improving };
  }, [grid]);

  if (!grid.length) {
    return (
      <div style={{ textAlign: 'center', color: '#64748b', padding: 80, fontSize: 14 }}>
        Loading pipeline data...
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div style={{ marginBottom: 20 }}>
        <h2 style={{ fontSize: 18, fontWeight: 700, color: '#e2e8f0', margin: '0 0 4px 0' }}>
          Pipeline Heat Map
          <span style={{ color: '#6366f1' }}> — Open Source CI Pipelines</span>
        </h2>
        <span style={{ color: '#64748b', fontSize: 12 }}>last 30 runs per repo · hover a cell for details · click to open run on GitHub</span>
      </div>

      {/* Summary bar */}
      {summary && (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(6, 1fr)',
          marginBottom: 20,
          background: '#1e293b',
          borderRadius: 10,
          border: '1px solid #334155',
          overflow: 'hidden',
        }}>
          {[
            { label: 'Total Runs',    value: summary.totalRuns,             color: '#e2e8f0' },
            { label: 'Passed',        value: summary.totalPass,             color: '#22c55e' },
            { label: 'Failed',        value: summary.totalFail,             color: '#ef4444' },
            { label: 'Overall Rate',  value: `${summary.overallRate}%`,     color: summary.overallRate >= 80 ? '#22c55e' : summary.overallRate >= 60 ? '#f59e0b' : '#ef4444' },
            { label: 'Improving',     value: `${summary.improving} repos`,  color: '#22c55e' },
            { label: 'Degrading',     value: `${summary.degrading} repos`,  color: summary.degrading > 0 ? '#ef4444' : '#475569' },
          ].map((stat, i, arr) => (
            <div key={stat.label} style={{
              padding: '16px 20px',
              textAlign: 'center',
              borderRight: i < arr.length - 1 ? '1px solid #334155' : 'none',
            }}>
              <div style={{ fontSize: 24, fontWeight: 700, color: stat.color }}>{stat.value}</div>
              <div style={{ fontSize: 12, color: '#64748b', marginTop: 4 }}>{stat.label}</div>
            </div>
          ))}
        </div>
      )}

      {/* Legend */}
      <div style={{
        display: 'flex', gap: 16, padding: '10px 20px',
        background: '#1e293b',
        borderRadius: '10px 10px 0 0',
        border: '1px solid #334155',
        borderBottom: 'none',
        flexWrap: 'wrap',
        alignItems: 'center',
      }}>
        <span style={{ fontSize: 11, color: '#475569', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Status</span>
        {Object.entries(STATUS_COLORS).filter(([s]) => s !== 'unknown').map(([status, color]) => (
          <div key={status} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            <span style={{ width: 12, height: 12, borderRadius: 3, background: color, display: 'inline-block' }} />
            <span style={{ fontSize: 12, color: '#94a3b8', textTransform: 'capitalize' }}>{status}</span>
          </div>
        ))}
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 12 }}>
          {Object.entries(TREND_CONFIG).filter(([k]) => k !== 'neutral').map(([key, t]) => (
            <span key={key} style={{ fontSize: 12, color: t.color }}>
              {t.icon} {t.label}
            </span>
          ))}
        </div>
      </div>

      {/* Grid rows — no overflow hidden so tooltips are never clipped */}
      <div style={{
        background: '#1e293b',
        borderRadius: '0 0 10px 10px',
        border: '1px solid #334155',
        borderTop: 'none',
      }}>
        {grid.map((row, i) => (
          <RepoRow key={row.module} row={row} isLast={i === grid.length - 1} />
        ))}
      </div>
    </div>
  );
}
