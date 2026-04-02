import React, { useState, useMemo } from 'react';
import { AlertTriangle, AlertCircle, Info, ChevronDown, ChevronRight, Zap } from 'lucide-react';

const SEVERITY_COLORS = { critical: '#ef4444', high: '#f97316', medium: '#f59e0b', low: '#3b82f6' };
const SEVERITY_ORDER  = ['critical', 'high', 'medium', 'low'];

function SeverityIcon({ severity }) {
  const color = SEVERITY_COLORS[severity] || '#94a3b8';
  if (severity === 'critical') return <AlertCircle size={16} color={color} />;
  if (severity === 'high')     return <AlertTriangle size={16} color={color} />;
  if (severity === 'medium')   return <Zap size={16} color={color} />;
  return <Info size={16} color={color} />;
}

function BottleneckCard({ b }) {
  const [expanded, setExpanded] = useState(false);
  const color = SEVERITY_COLORS[b.severity] || '#94a3b8';

  return (
    <div style={{
      background: '#1e293b', border: '1px solid #334155',
      borderLeft: `4px solid ${color}`,
      borderRadius: 10, padding: 16, marginBottom: 10,
    }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, flex: 1 }}>
          <SeverityIcon severity={b.severity} />
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              <span style={{ fontWeight: 600, color: '#e2e8f0', fontSize: 14 }}>{b.title}</span>
              <span style={{
                background: `${color}20`, color, border: `1px solid ${color}40`,
                borderRadius: 10, padding: '1px 8px', fontSize: 11, fontWeight: 600, textTransform: 'capitalize',
              }}>{b.severity}</span>
              <span style={{
                background: '#0f172a', color: '#64748b', border: '1px solid #334155',
                borderRadius: 6, padding: '1px 6px', fontSize: 10,
              }}>{(b.type || '').replace(/_/g, ' ')}</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 5, flexWrap: 'wrap' }}>
              <span style={{ color: '#64748b', fontSize: 12 }}>Module: <span style={{ color: '#94a3b8' }}>{b.module}</span></span>
              {b.metric && (
                <span style={{
                  background: '#0f172a', color: '#f59e0b', border: '1px solid #334155',
                  borderRadius: 6, padding: '1px 8px', fontSize: 11, fontFamily: 'monospace',
                }}>{b.metric}</span>
              )}
            </div>
          </div>
        </div>
      </div>

      <button
        onClick={() => setExpanded(e => !e)}
        style={{
          display: 'flex', alignItems: 'center', gap: 4, marginTop: 8,
          background: 'none', border: 'none', color: '#6366f1', cursor: 'pointer', fontSize: 12, padding: 0,
        }}
      >
        {expanded ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
        {expanded ? 'Hide details' : 'Show details'}
      </button>

      {expanded && (
        <div style={{ marginTop: 12 }}>
          <p style={{ color: '#94a3b8', fontSize: 13, lineHeight: 1.5, marginBottom: 10 }}>{b.description}</p>
          <div style={{
            background: '#0f172a', border: '1px solid #334155',
            borderLeft: `3px solid #6366f1`,
            borderRadius: 6, padding: '10px 14px',
          }}>
            <div style={{ color: '#6366f1', fontSize: 11, fontWeight: 600, marginBottom: 4, textTransform: 'uppercase', letterSpacing: 0.5 }}>
              Recommendation
            </div>
            <p style={{ color: '#e2e8f0', fontSize: 13, lineHeight: 1.5 }}>{b.recommendation}</p>
          </div>
        </div>
      )}
    </div>
  );
}

export default function Bottlenecks({ bottlenecks = [] }) {
  const [severityFilter, setSeverityFilter] = useState('all');

  const filtered = useMemo(() => {
    if (severityFilter === 'all') return bottlenecks;
    return bottlenecks.filter(b => b.severity === severityFilter);
  }, [bottlenecks, severityFilter]);

  const counts = useMemo(() =>
    SEVERITY_ORDER.reduce((acc, s) => ({ ...acc, [s]: bottlenecks.filter(b => b.severity === s).length }), {}),
  [bottlenecks]);

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16, flexWrap: 'wrap', gap: 10 }}>
        <h2 style={{ fontSize: 16, fontWeight: 600, color: '#e2e8f0' }}>
          AI-Detected Bottlenecks
          <span style={{ color: '#64748b', fontSize: 12, fontWeight: 400, marginLeft: 8 }}>
            {bottlenecks.length} issue{bottlenecks.length !== 1 ? 's' : ''} found
          </span>
        </h2>

        {/* Severity filters */}
        <div style={{ display: 'flex', gap: 6 }}>
          <button onClick={() => setSeverityFilter('all')} style={{
            padding: '4px 10px', borderRadius: 12, fontSize: 12, cursor: 'pointer',
            background: severityFilter === 'all' ? '#6366f1' : 'transparent',
            border: `1px solid ${severityFilter === 'all' ? '#6366f1' : '#334155'}`,
            color: severityFilter === 'all' ? '#fff' : '#94a3b8',
          }}>All ({bottlenecks.length})</button>
          {SEVERITY_ORDER.map(s => counts[s] > 0 && (
            <button key={s} onClick={() => setSeverityFilter(s)} style={{
              padding: '4px 10px', borderRadius: 12, fontSize: 12, cursor: 'pointer',
              textTransform: 'capitalize',
              background: severityFilter === s ? SEVERITY_COLORS[s] : 'transparent',
              border: `1px solid ${severityFilter === s ? SEVERITY_COLORS[s] : '#334155'}`,
              color: severityFilter === s ? '#fff' : SEVERITY_COLORS[s],
            }}>{s} ({counts[s]})</button>
          ))}
        </div>
      </div>

      {filtered.length === 0 ? (
        <div style={{
          textAlign: 'center', padding: 60, color: '#475569',
          background: '#1e293b', borderRadius: 10, border: '1px solid #334155',
        }}>
          {bottlenecks.length === 0
            ? 'No bottlenecks detected — pipeline is healthy'
            : 'No bottlenecks match selected filter'}
        </div>
      ) : (
        filtered.map(b => <BottleneckCard key={b.id} b={b} />)
      )}
    </div>
  );
}
