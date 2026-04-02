import React, { useState, useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { ExternalLink, Bug, BookOpen, CheckSquare, Zap } from 'lucide-react';

function timeAgo(iso) {
  if (!iso) return '—';
  const diff = Math.round((Date.now() - new Date(iso)) / 1000);
  if (diff < 60)   return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

const PRIORITY_COLORS = { Blocker: '#ef4444', Critical: '#ef4444', High: '#f97316', Medium: '#f59e0b', Low: '#3b82f6', Trivial: '#64748b' };
const STATUS_COLORS   = { Open: '#60a5fa', 'In Progress': '#f59e0b', Done: '#22c55e', Resolved: '#22c55e', Closed: '#64748b', Reopened: '#f97316' };
const BAR_COLORS      = ['#6366f1','#8b5cf6','#a78bfa','#c4b5fd','#60a5fa','#34d399','#f59e0b','#f97316','#ef4444'];

function TypeIcon({ type }) {
  if (type === 'Bug')           return <Bug size={13} color="#ef4444" />;
  if (type === 'Story')         return <BookOpen size={13} color="#6366f1" />;
  if (type === 'Task')          return <CheckSquare size={13} color="#22c55e" />;
  if (type === 'Improvement')   return <Zap size={13} color="#f59e0b" />;
  return <span style={{ fontSize: 11, color: '#94a3b8' }}>{(type || '?')[0]}</span>;
}

const customTooltipStyle = {
  background: '#1e293b', border: '1px solid #334155', color: '#e2e8f0',
  borderRadius: 6, fontSize: 12, padding: '6px 10px',
};

export default function JiraBoard({ jiraData = {} }) {
  const { allIssues = [], metrics = {} } = jiraData;
  const [typeFilter, setTypeFilter]     = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');

  const types    = useMemo(() => ['all', ...new Set(allIssues.map(i => i.fields?.issuetype?.name).filter(Boolean))], [allIssues]);
  const statuses = useMemo(() => ['all', ...new Set(allIssues.map(i => i.fields?.status?.name).filter(Boolean))], [allIssues]);

  const filtered = useMemo(() => {
    let r = allIssues;
    if (typeFilter   !== 'all') r = r.filter(i => i.fields?.issuetype?.name === typeFilter);
    if (statusFilter !== 'all') r = r.filter(i => i.fields?.status?.name    === statusFilter);
    return r.slice(0, 50);
  }, [allIssues, typeFilter, statusFilter]);

  const statusData   = Object.entries(metrics.byStatus   || {}).map(([name, val]) => ({ name, val }));
  const priorityData = Object.entries(metrics.byPriority || {}).map(([name, val]) => ({ name, val }));

  const jiraBase = 'https://issues.apache.org/jira/browse';

  return (
    <div>
      <h2 style={{ fontSize: 16, fontWeight: 600, marginBottom: 16, color: '#e2e8f0' }}>Jira Board</h2>

      {/* Charts row */}
      <div style={{ display: 'flex', gap: 16, marginBottom: 20, flexWrap: 'wrap' }}>
        <div style={{ flex: 1, minWidth: 260, background: '#1e293b', border: '1px solid #334155', borderRadius: 10, padding: 16 }}>
          <p style={{ color: '#64748b', fontSize: 12, marginBottom: 12, textTransform: 'uppercase', letterSpacing: 0.5 }}>By Status</p>
          <ResponsiveContainer width="100%" height={160}>
            <BarChart data={statusData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
              <XAxis dataKey="name" tick={{ fill: '#64748b', fontSize: 10 }} />
              <YAxis tick={{ fill: '#64748b', fontSize: 10 }} />
              <Tooltip contentStyle={customTooltipStyle} cursor={{ fill: '#334155' }} />
              <Bar dataKey="val" radius={[3,3,0,0]}>
                {statusData.map((entry, i) => (
                  <Cell key={i} fill={STATUS_COLORS[entry.name] || BAR_COLORS[i % BAR_COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div style={{ flex: 1, minWidth: 260, background: '#1e293b', border: '1px solid #334155', borderRadius: 10, padding: 16 }}>
          <p style={{ color: '#64748b', fontSize: 12, marginBottom: 12, textTransform: 'uppercase', letterSpacing: 0.5 }}>By Priority</p>
          <ResponsiveContainer width="100%" height={160}>
            <BarChart data={priorityData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
              <XAxis dataKey="name" tick={{ fill: '#64748b', fontSize: 10 }} />
              <YAxis tick={{ fill: '#64748b', fontSize: 10 }} />
              <Tooltip contentStyle={customTooltipStyle} cursor={{ fill: '#334155' }} />
              <Bar dataKey="val" radius={[3,3,0,0]}>
                {priorityData.map((entry, i) => (
                  <Cell key={i} fill={PRIORITY_COLORS[entry.name] || BAR_COLORS[i % BAR_COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 12, flexWrap: 'wrap' }}>
        <select value={typeFilter} onChange={e => setTypeFilter(e.target.value)}
          style={{ background: '#1e293b', border: '1px solid #334155', color: '#e2e8f0', borderRadius: 6, padding: '5px 8px', fontSize: 12 }}>
          {types.map(t => <option key={t} value={t}>{t === 'all' ? 'All types' : t}</option>)}
        </select>
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
          style={{ background: '#1e293b', border: '1px solid #334155', color: '#e2e8f0', borderRadius: 6, padding: '5px 8px', fontSize: 12 }}>
          {statuses.map(s => <option key={s} value={s}>{s === 'all' ? 'All statuses' : s}</option>)}
        </select>
        <span style={{ color: '#64748b', fontSize: 12, alignSelf: 'center' }}>
          {filtered.length} issues
        </span>
      </div>

      {/* Issue table */}
      <div style={{ background: '#1e293b', borderRadius: 10, border: '1px solid #334155', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr style={{ borderBottom: '1px solid #334155' }}>
              {['Key', 'Type', 'Summary', 'Status', 'Priority', 'Updated'].map(h => (
                <th key={h} style={{ padding: '10px 14px', textAlign: 'left', color: '#64748b', fontWeight: 500, fontSize: 11, textTransform: 'uppercase' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr><td colSpan={6} style={{ textAlign: 'center', padding: 40, color: '#475569' }}>No issues match filter</td></tr>
            ) : filtered.map(issue => {
              const f        = issue.fields || {};
              const status   = f.status?.name   || '—';
              const priority = f.priority?.name || '—';
              const type     = f.issuetype?.name || '—';
              return (
                <tr key={issue.id} style={{ borderBottom: '1px solid #0f172a' }}>
                  <td style={{ padding: '8px 14px' }}>
                    <a href={`${jiraBase}/${issue.key}`} target="_blank" rel="noreferrer"
                      style={{ color: '#6366f1', fontSize: 12, fontWeight: 600, textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 3 }}>
                      {issue.key} <ExternalLink size={10} />
                    </a>
                  </td>
                  <td style={{ padding: '8px 14px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                      <TypeIcon type={type} />
                      <span style={{ color: '#94a3b8', fontSize: 11 }}>{type}</span>
                    </div>
                  </td>
                  <td style={{ padding: '8px 14px', maxWidth: 280 }}>
                    <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: '#e2e8f0', fontSize: 12 }}>
                      {f.summary || '—'}
                    </div>
                    {f.assignee && (
                      <div style={{ color: '#64748b', fontSize: 11 }}>{f.assignee.displayName}</div>
                    )}
                  </td>
                  <td style={{ padding: '8px 14px' }}>
                    <span style={{
                      background: `${STATUS_COLORS[status] || '#94a3b8'}20`,
                      color: STATUS_COLORS[status] || '#94a3b8',
                      border: `1px solid ${STATUS_COLORS[status] || '#94a3b8'}40`,
                      borderRadius: 10, padding: '2px 8px', fontSize: 11, fontWeight: 600,
                    }}>{status}</span>
                  </td>
                  <td style={{ padding: '8px 14px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                      <span style={{ width: 7, height: 7, borderRadius: '50%', background: PRIORITY_COLORS[priority] || '#94a3b8', display: 'inline-block' }} />
                      <span style={{ color: PRIORITY_COLORS[priority] || '#94a3b8', fontSize: 12 }}>{priority}</span>
                    </div>
                  </td>
                  <td style={{ padding: '8px 14px', color: '#64748b', fontSize: 11, whiteSpace: 'nowrap' }}>
                    {timeAgo(f.updated)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
