import React, { useState, useMemo } from 'react';
import { ExternalLink, GitBranch, User } from 'lucide-react';

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
  if (!sec || sec <= 0) return '—';
  if (sec < 60) return `${sec}s`;
  return `${Math.floor(sec / 60)}m ${sec % 60}s`;
}

function timeAgo(iso) {
  if (!iso) return '—';
  const diff = Math.round((Date.now() - new Date(iso)) / 1000);
  if (diff < 60)   return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

function StatusBadge({ status }) {
  const color = STATUS_COLORS[status] || '#94a3b8';
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 5,
      background: `${color}20`, color, border: `1px solid ${color}40`,
      borderRadius: 12, padding: '2px 8px', fontSize: 11, fontWeight: 600,
      textTransform: 'capitalize',
    }}>
      <span style={{ width: 6, height: 6, borderRadius: '50%', background: color, display: 'inline-block' }} />
      {status}
    </span>
  );
}

const FILTERS = ['all', 'success', 'failure', 'running', 'queued', 'cancelled'];

export default function CIPipeline({ runs = [] }) {
  const [statusFilter, setStatusFilter] = useState('all');
  const [repoFilter, setRepoFilter]     = useState('all');

  const repos = useMemo(() => ['all', ...new Set(runs.map(r => r.repoLabel || r.repo))], [runs]);

  const filtered = useMemo(() => {
    let r = runs;
    if (statusFilter !== 'all') r = r.filter(x => x.status === statusFilter);
    if (repoFilter   !== 'all') r = r.filter(x => (x.repoLabel || x.repo) === repoFilter);
    return r.slice(0, 100);
  }, [runs, statusFilter, repoFilter]);

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16, flexWrap: 'wrap', gap: 10 }}>
        <h2 style={{ fontSize: 16, fontWeight: 600, color: '#e2e8f0', margin: 0 }}>
          CI Pipeline Runs
          <span style={{ color: '#6366f1' }}> — Open Source CI Pipelines</span>
        </h2>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {/* Status chips */}
          <div style={{ display: 'flex', gap: 4 }}>
            {FILTERS.map(f => (
              <button key={f} onClick={() => setStatusFilter(f)} style={{
                padding: '4px 10px', borderRadius: 12, fontSize: 12, cursor: 'pointer',
                border: '1px solid', textTransform: 'capitalize',
                background: statusFilter === f ? (STATUS_COLORS[f] || '#6366f1') : 'transparent',
                borderColor: statusFilter === f ? (STATUS_COLORS[f] || '#6366f1') : '#334155',
                color: statusFilter === f ? '#fff' : '#94a3b8',
              }}>{f}</button>
            ))}
          </div>
          {/* Repo dropdown */}
          <select
            value={repoFilter}
            onChange={e => setRepoFilter(e.target.value)}
            style={{
              background: '#1e293b', border: '1px solid #334155', color: '#e2e8f0',
              borderRadius: 6, padding: '4px 8px', fontSize: 12, cursor: 'pointer',
            }}
          >
            {repos.map(r => <option key={r} value={r}>{r === 'all' ? 'All repos' : r}</option>)}
          </select>
        </div>
      </div>

      <div style={{ background: '#1e293b', borderRadius: 10, border: '1px solid #334155', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr style={{ borderBottom: '1px solid #334155' }}>
              {['Status', 'Repo / Run', 'Branch & Commit', 'Workflow', 'Duration', 'Time / Actor', ''].map(h => (
                <th key={h} style={{ padding: '10px 14px', textAlign: 'left', color: '#64748b', fontWeight: 500, fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.5 }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr><td colSpan={7} style={{ textAlign: 'center', padding: 40, color: '#475569' }}>No runs match filter</td></tr>
            ) : filtered.map(run => (
              <tr key={run.id} style={{ borderBottom: '1px solid #1e293b' }}>
                <td style={{ padding: '10px 14px' }}><StatusBadge status={run.status} /></td>
                <td style={{ padding: '10px 14px' }}>
                  <div style={{ fontWeight: 600, color: '#e2e8f0' }}>{run.repoLabel || run.repo}</div>
                  <div style={{ color: '#64748b', fontSize: 11 }}>#{run.runNumber}</div>
                </td>
                <td style={{ padding: '10px 14px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4, color: '#94a3b8' }}>
                    <GitBranch size={11} />
                    <span style={{ fontSize: 12 }}>{run.branch || '—'}</span>
                  </div>
                  {run.commitSha && (
                    <code style={{ fontSize: 11, color: '#6366f1', background: '#1e293b', padding: '1px 4px', borderRadius: 3 }}>
                      {run.commitSha}
                    </code>
                  )}
                </td>
                <td style={{ padding: '10px 14px', color: '#94a3b8', maxWidth: 200 }}>
                  <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {run.name || '—'}
                  </div>
                  {run.displayTitle && (
                    <div style={{ fontSize: 11, color: '#475569', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {run.displayTitle}
                    </div>
                  )}
                </td>
                <td style={{ padding: '10px 14px', color: '#94a3b8', whiteSpace: 'nowrap' }}>
                  {fmtDuration(run.durationSec)}
                </td>
                <td style={{ padding: '10px 14px' }}>
                  <div style={{ color: '#94a3b8', fontSize: 12 }}>{timeAgo(run.startedAt)}</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4, color: '#64748b', fontSize: 11 }}>
                    <User size={10} />{run.actor}
                  </div>
                </td>
                <td style={{ padding: '10px 14px' }}>
                  {run.url && (
                    <a href={run.url} target="_blank" rel="noreferrer" style={{ color: '#6366f1' }}>
                      <ExternalLink size={14} />
                    </a>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div style={{ color: '#475569', fontSize: 12, marginTop: 8 }}>
        Showing {filtered.length} of {runs.length} runs
      </div>
    </div>
  );
}
