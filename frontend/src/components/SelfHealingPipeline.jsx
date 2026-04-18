import React, { useState, useMemo } from 'react';
import {
  ExternalLink, GitBranch, Zap, CheckCircle, XCircle, Clock, Flame,
  Activity, Shield, RefreshCw, AlertTriangle, TestTube, TrendingUp,
  History, ChevronDown, Search, Filter,
} from 'lucide-react';

// ─── Constants ───────────────────────────────────────────────────────────────

const STATUS_COLORS = {
  success:   '#22c55e',
  failure:   '#ef4444',
  running:   '#60a5fa',
  queued:    '#f59e0b',
  cancelled: '#64748b',
  skipped:   '#475569',
  unknown:   '#334155',
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

function fmtDuration(sec) {
  if (!sec || sec <= 0) return '—';
  if (sec < 60) return `${sec}s`;
  const m = Math.floor(sec / 60), s = sec % 60;
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

function fmtDate(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: '2-digit' });
}

// ─── Shared Sub-components ────────────────────────────────────────────────────

function StatCard({ icon: Icon, label, value, sub, color = '#60a5fa' }) {
  return (
    <div style={{
      background: '#0f172a', border: '1px solid #1e293b', borderRadius: 12,
      padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 14, flex: 1, minWidth: 150,
    }}>
      <div style={{ width: 40, height: 40, borderRadius: 10, background: `${color}20`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        <Icon size={18} color={color} />
      </div>
      <div style={{ minWidth: 0 }}>
        <div style={{ fontSize: 10, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 3 }}>{label}</div>
        <div style={{ fontSize: 22, fontWeight: 700, color: '#f1f5f9', lineHeight: 1 }}>{value}</div>
        {sub && <div style={{ fontSize: 11, color: '#475569', marginTop: 3 }}>{sub}</div>}
      </div>
    </div>
  );
}

function StatusBadge({ status }) {
  const color = STATUS_COLORS[status] || '#94a3b8';
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 5,
      background: `${color}18`, color, border: `1px solid ${color}40`,
      borderRadius: 12, padding: '2px 10px', fontSize: 11, fontWeight: 600,
      textTransform: 'capitalize', whiteSpace: 'nowrap',
    }}>
      <span style={{ width: 6, height: 6, borderRadius: '50%', background: color, display: 'inline-block',
        ...(status === 'running' ? { animation: 'pulse 1.4s infinite' } : {}) }} />
      {status}
    </span>
  );
}

function CollapsibleSection({ title, icon, badge, defaultOpen = true, count, children }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div style={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: 12, overflow: 'hidden' }}>
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '14px 20px', background: 'none', border: 'none', cursor: 'pointer',
          borderBottom: open ? '1px solid #1e293b' : 'none',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {icon}
          <span style={{ fontSize: 13, fontWeight: 600, color: '#94a3b8' }}>{title}</span>
          {count !== undefined && <span style={{ fontSize: 11, color: '#475569' }}>({count})</span>}
          {badge}
        </div>
        <ChevronDown size={14} color="#475569" style={{ transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
      </button>
      {open && <div style={{ padding: '16px 20px' }}>{children}</div>}
    </div>
  );
}

// ─── Metric Grid ──────────────────────────────────────────────────────────────

function MetricGrid({ metrics }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(155px, 1fr))', gap: 12 }}>
      {metrics.map(m => (
        <div key={m.label} style={{
          background: '#0a1628', border: '1px solid #1e293b', borderRadius: 10,
          padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 12,
        }}>
          <div style={{ width: 32, height: 32, borderRadius: 8, background: `${m.color}20`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <m.icon size={15} color={m.color} />
          </div>
          <div>
            <div style={{ fontSize: 9, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{m.label}</div>
            <div style={{ fontSize: 20, fontWeight: 700, color: '#f1f5f9', lineHeight: 1.2 }}>{m.value}</div>
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Healing Metrics Panel ────────────────────────────────────────────────────

function HealingMetrics({ ciSummary, dashboardData, repoUrl }) {
  if (dashboardData?.latest) {
    const s  = dashboardData.latest.stats || {};
    const wf = dashboardData.latest.workflow || {};
    const passed   = (s.totalTestsCompleted || 0) - (s.totalFailures || 0);
    const healRate = parseFloat(s.healSuccessRate || 0);

    const latest = [
      { label: 'Tests Run',        value: s.totalTestsCompleted ?? '—', icon: TestTube,    color: '#60a5fa' },
      { label: 'Passed',           value: passed,                        icon: CheckCircle, color: '#22c55e' },
      { label: 'Failed',           value: s.totalFailures ?? '—',        icon: XCircle,     color: '#ef4444' },
      { label: 'Selector Heals',   value: s.totalSelectorHeals ?? '—',   icon: Shield,      color: '#a78bfa' },
      { label: 'Flow Recoveries',  value: s.totalFlowHeals ?? '—',       icon: RefreshCw,   color: '#34d399' },
      { label: 'Time Saved (Est.)',value: `${s.estimatedTimeSaved ?? 0}h`,icon: Clock,       color: '#f59e0b' },
      { label: 'Heal Success Rate',value: `${healRate}%`,                 icon: TrendingUp,  color: healRate >= 50 ? '#22c55e' : '#f59e0b' },
    ];

    // Aggregate totals from history
    const hist = dashboardData.history || [];
    const totals = hist.reduce((acc, r) => ({
      tests:    acc.tests    + (r.totalTestsCompleted || 0),
      failures: acc.failures + (r.totalFailures || 0),
      selHeals: acc.selHeals + (r.totalSelectorHeals || 0),
      flowHeals:acc.flowHeals+ (r.totalFlowHeals || 0),
    }), { tests: 0, failures: 0, selHeals: 0, flowHeals: 0 });
    const allTimePassed = totals.tests - totals.failures;
    const allTimePassRate = totals.tests ? Math.round((allTimePassed / totals.tests) * 100) : 0;

    const historical = [
      { label: 'Total Tests Run',  value: totals.tests,    icon: TestTube,    color: '#60a5fa' },
      { label: 'Total Passed',     value: allTimePassed,   icon: CheckCircle, color: '#22c55e' },
      { label: 'Total Failures',   value: totals.failures, icon: XCircle,     color: '#ef4444' },
      { label: 'Total Sel. Heals', value: totals.selHeals, icon: Shield,      color: '#a78bfa' },
      { label: 'Total Flow Heals', value: totals.flowHeals,icon: RefreshCw,   color: '#34d399' },
      { label: 'Overall Pass Rate',value: `${allTimePassRate}%`, icon: TrendingUp, color: allTimePassRate >= 70 ? '#22c55e' : '#f59e0b' },
    ];

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {/* Latest run */}
        <div style={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: 12, padding: '18px 22px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
            <div>
              <span style={{ fontSize: 13, fontWeight: 600, color: '#94a3b8' }}>Latest Run Metrics</span>
              <span style={{ marginLeft: 10, fontSize: 11, color: '#475569' }}>
                Run #{wf.runNumber} · {timeAgo(dashboardData.latest.generatedAt)} · branch: {wf.branch || 'main'}
              </span>
            </div>
            <a href={`https://github.com/${wf.repository}/actions/runs/${wf.runId}`}
              target="_blank" rel="noopener noreferrer"
              style={{ fontSize: 11, color: '#475569', display: 'flex', alignItems: 'center', gap: 4, textDecoration: 'none' }}>
              <ExternalLink size={11} /> View run
            </a>
          </div>
          <MetricGrid metrics={latest} />
        </div>

        {/* All-time totals */}
        {hist.length > 1 && (
          <div style={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: 12, padding: '18px 22px' }}>
            <div style={{ marginBottom: 14 }}>
              <span style={{ fontSize: 13, fontWeight: 600, color: '#94a3b8' }}>All-Time Totals</span>
              <span style={{ marginLeft: 10, fontSize: 11, color: '#475569' }}>across {hist.length} stored runs</span>
            </div>
            <MetricGrid metrics={historical} />
          </div>
        )}
      </div>
    );
  }

  if (!ciSummary) {
    return (
      <div style={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: 12, padding: '20px 24px' }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: '#94a3b8', marginBottom: 12 }}>Healing Metrics</div>
        <div style={{ color: '#475569', fontSize: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
          <AlertTriangle size={14} />
          No CI summary data found. Metrics appear after a completed CI run.
        </div>
      </div>
    );
  }

  const metrics = [
    { label: 'Total Healing Runs', value: ciSummary.totalRuns,            icon: Activity,    color: '#60a5fa' },
    { label: 'Selector Heals',     value: ciSummary.selectorHeals,        icon: Shield,      color: '#a78bfa' },
    { label: 'Flow Recoveries',    value: ciSummary.flowHeals,            icon: RefreshCw,   color: '#34d399' },
    { label: 'Failures',           value: ciSummary.failures,             icon: XCircle,     color: '#ef4444' },
    { label: 'Time Saved (Est.)',  value: `${ciSummary.timeSavedHours}h`, icon: Clock,       color: '#f59e0b' },
    { label: 'Heal Success Rate',  value: `${ciSummary.healRate}%`,       icon: CheckCircle, color: ciSummary.healRate > 50 ? '#22c55e' : '#f59e0b' },
  ];

  return (
    <div style={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: 12, padding: '20px 24px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: '#94a3b8' }}>
          Healing Metrics
          <span style={{ marginLeft: 8, fontSize: 11, color: '#475569', fontWeight: 400 }}>
            run #{ciSummary.runNumber} · {timeAgo(ciSummary.runAt)}
          </span>
        </div>
        <a href={ciSummary.runUrl} target="_blank" rel="noopener noreferrer"
          style={{ fontSize: 11, color: '#475569', display: 'flex', alignItems: 'center', gap: 4, textDecoration: 'none' }}>
          <ExternalLink size={11} /> View run
        </a>
      </div>
      <MetricGrid metrics={metrics} />
    </div>
  );
}

// ─── 30-Day Activity Chart (full-width bar chart) ─────────────────────────────

function ActivityChart({ heatmap }) {
  const [hovered, setHovered] = useState(null);

  const last30 = useMemo(() => {
    const now = Date.now();
    return heatmap
      .filter(d => now - new Date(d.date + 'T12:00:00Z') <= 30 * 86400000)
      .sort((a, b) => a.date.localeCompare(b.date));
  }, [heatmap]);

  const maxTotal = Math.max(...last30.map(d => d.total), 1);

  function barColor(day) {
    if (!day.total) return '#1e293b';
    if (day.failure === 0) return '#22c55e';
    if (day.success === 0) return '#ef4444';
    return day.success / day.total >= 0.5 ? '#84cc16' : '#f97316';
  }

  return (
    <div style={{ position: 'relative' }}>
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 4, height: 80, width: '100%' }}>
        {last30.map((day, i) => {
          const heightPct = day.total ? Math.max((day.total / maxTotal) * 100, 8) : 4;
          const color = barColor(day);
          const isHovered = hovered?.date === day.date;
          return (
            <div
              key={day.date}
              style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', position: 'relative', cursor: day.total ? 'pointer' : 'default' }}
              onMouseEnter={() => day.total && setHovered(day)}
              onMouseLeave={() => setHovered(null)}
            >
              <div style={{
                width: '100%',
                height: `${heightPct}%`,
                background: color,
                borderRadius: '3px 3px 0 0',
                opacity: isHovered ? 1 : (day.total ? 0.75 : 0.2),
                transition: 'opacity 0.15s',
                minHeight: 3,
                boxShadow: isHovered ? `0 0 8px ${color}80` : 'none',
              }} />
            </div>
          );
        })}
      </div>

      {/* X-axis labels (every 5 days) */}
      <div style={{ display: 'flex', marginTop: 6 }}>
        {last30.map((day, i) => (
          <div key={day.date} style={{ flex: 1, textAlign: 'center' }}>
            {i % 5 === 0 && (
              <span style={{ fontSize: 9, color: '#475569' }}>
                {new Date(day.date + 'T12:00:00Z').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
              </span>
            )}
          </div>
        ))}
      </div>

      {/* Tooltip */}
      {hovered && (
        <div style={{
          position: 'absolute', bottom: 'calc(100% + 10px)', left: '50%', transform: 'translateX(-50%)',
          background: '#1e293b', border: '1px solid #334155', borderRadius: 8,
          padding: '10px 14px', fontSize: 12, color: '#f1f5f9', whiteSpace: 'nowrap', zIndex: 50, pointerEvents: 'none',
        }}>
          <div style={{ fontWeight: 600, marginBottom: 4 }}>{hovered.date}</div>
          <div style={{ color: STATUS_COLORS.success }}>✓ {hovered.success} passed</div>
          {hovered.failure > 0 && <div style={{ color: STATUS_COLORS.failure }}>✗ {hovered.failure} failed</div>}
          {hovered.running > 0 && <div style={{ color: STATUS_COLORS.running }}>↻ {hovered.running} running</div>}
          <div style={{ color: '#64748b', marginTop: 2 }}>{hovered.total} total</div>
        </div>
      )}

      {/* Legend */}
      <div style={{ display: 'flex', gap: 14, marginTop: 10, justifyContent: 'flex-end', flexWrap: 'wrap' }}>
        {[['#22c55e', 'All passed'], ['#84cc16', 'Mostly passed'], ['#f97316', 'Mostly failed'], ['#ef4444', 'All failed']].map(([c, l]) => (
          <div key={l} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            <div style={{ width: 10, height: 10, borderRadius: 2, background: c }} />
            <span style={{ fontSize: 10, color: '#64748b' }}>{l}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Per-Test Case Breakdown ──────────────────────────────────────────────────

function TestCaseTable({ runs }) {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  const filtered = useMemo(() => {
    let r = runs;
    if (statusFilter !== 'all') r = r.filter(t => statusFilter === 'passed' ? t.failures === 0 : t.failures > 0);
    if (search.trim()) r = r.filter(t => t.testId?.toLowerCase().includes(search.toLowerCase()));
    return r;
  }, [runs, search, statusFilter]);

  const passCount = runs.filter(t => t.failures === 0).length;
  const failCount = runs.length - passCount;

  return (
    <div>
      {/* Filters bar */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 14, flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ position: 'relative', flex: 1, minWidth: 200 }}>
          <Search size={12} color="#475569" style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)' }} />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search test ID…"
            style={{
              width: '100%', padding: '6px 10px 6px 30px', background: '#0a1628',
              border: '1px solid #1e293b', borderRadius: 8, color: '#f1f5f9', fontSize: 12,
              outline: 'none', boxSizing: 'border-box',
            }}
          />
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          {[['all', `All (${runs.length})`], ['passed', `Passed (${passCount})`], ['failed', `Failed (${failCount})`]].map(([v, l]) => (
            <button key={v} onClick={() => setStatusFilter(v)} style={{
              padding: '5px 12px', borderRadius: 8, fontSize: 12, fontWeight: statusFilter === v ? 600 : 400,
              cursor: 'pointer', border: statusFilter === v ? '1px solid #60a5fa' : '1px solid #1e293b',
              background: statusFilter === v ? '#60a5fa18' : '#0a1628',
              color: statusFilter === v ? '#60a5fa' : '#64748b',
            }}>{l}</button>
          ))}
        </div>
      </div>

      {filtered.length === 0 ? (
        <div style={{ textAlign: 'center', color: '#475569', padding: '24px 0', fontSize: 13 }}>No matching tests.</div>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #1e293b' }}>
                {['Test ID', 'Status', 'Steps', 'Sel. Heals', 'Flow Heals', 'Failures', 'Duration'].map(h => (
                  <th key={h} style={{ padding: '8px 12px', textAlign: h === 'Test ID' ? 'left' : 'center', color: '#64748b', fontWeight: 500, fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.04em', whiteSpace: 'nowrap' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((r, i) => {
                const passed = r.failures === 0;
                const sc = passed ? '#22c55e' : '#ef4444';
                const durSec = r.durationMs ? Math.round(r.durationMs / 1000) : 0;
                const cleanId = r.testId?.replace(/_\d{4}-\d{2}-.*$/, '') || `Test ${i + 1}`;
                return (
                  <tr key={r.testId || i} style={{ borderBottom: '1px solid #0a1628', background: i % 2 === 0 ? 'transparent' : '#0a162815' }}>
                    <td style={{ padding: '9px 12px', color: '#f1f5f9', fontWeight: 500, maxWidth: 300, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      <span style={{ display: 'inline-block', width: 7, height: 7, borderRadius: '50%', background: sc, marginRight: 8, verticalAlign: 'middle', flexShrink: 0 }} />
                      {cleanId}
                    </td>
                    <td style={{ padding: '9px 12px', textAlign: 'center' }}>
                      <span style={{ fontSize: 11, fontWeight: 600, color: sc, background: `${sc}18`, border: `1px solid ${sc}40`, borderRadius: 8, padding: '2px 8px' }}>
                        {passed ? 'Passed' : 'Failed'}
                      </span>
                    </td>
                    <td style={{ padding: '9px 12px', textAlign: 'center', color: '#94a3b8' }}>{r.totalSteps ?? '—'}</td>
                    <td style={{ padding: '9px 12px', textAlign: 'center', color: r.selectorHeals > 0 ? '#a78bfa' : '#475569', fontWeight: r.selectorHeals > 0 ? 700 : 400 }}>{r.selectorHeals ?? 0}</td>
                    <td style={{ padding: '9px 12px', textAlign: 'center', color: r.flowHeals > 0 ? '#34d399' : '#475569', fontWeight: r.flowHeals > 0 ? 700 : 400 }}>{r.flowHeals ?? 0}</td>
                    <td style={{ padding: '9px 12px', textAlign: 'center', color: r.failures > 0 ? '#ef4444' : '#475569', fontWeight: r.failures > 0 ? 700 : 400 }}>{r.failures ?? 0}</td>
                    <td style={{ padding: '9px 12px', textAlign: 'center', color: '#94a3b8' }}>{fmtDuration(durSec)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ─── Run History Table ────────────────────────────────────────────────────────

function RunHistoryTable({ history, repoOwner, repoName }) {
  const [sortBy, setSortBy] = useState('date');
  const [filterStatus, setFilterStatus] = useState('all');

  const sorted = useMemo(() => {
    let r = [...history];
    if (filterStatus === 'healthy') r = r.filter(h => (h.totalFailures || 0) === 0);
    if (filterStatus === 'failed')  r = r.filter(h => (h.totalFailures || 0) > 0);
    if (sortBy === 'date')     r.sort((a, b) => new Date(b.generatedAt) - new Date(a.generatedAt));
    if (sortBy === 'healRate') r.sort((a, b) => parseFloat(b.healSuccessRate || 0) - parseFloat(a.healSuccessRate || 0));
    if (sortBy === 'failures') r.sort((a, b) => (b.totalFailures || 0) - (a.totalFailures || 0));
    return r;
  }, [history, sortBy, filterStatus]);

  const allFailed = history.filter(h => (h.totalFailures || 0) > 0).length;

  return (
    <div>
      {/* Filters */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 14, flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          <Filter size={12} color="#475569" />
          {[['all', `All (${history.length})`], ['healthy', `Healthy (${history.length - allFailed})`], ['failed', `Had Failures (${allFailed})`]].map(([v, l]) => (
            <button key={v} onClick={() => setFilterStatus(v)} style={{
              padding: '5px 12px', borderRadius: 8, fontSize: 12, fontWeight: filterStatus === v ? 600 : 400,
              cursor: 'pointer', border: filterStatus === v ? '1px solid #60a5fa' : '1px solid #1e293b',
              background: filterStatus === v ? '#60a5fa18' : '#0a1628',
              color: filterStatus === v ? '#60a5fa' : '#64748b',
            }}>{l}</button>
          ))}
        </div>
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ fontSize: 11, color: '#475569' }}>Sort:</span>
          {[['date', 'Date'], ['healRate', 'Heal Rate'], ['failures', 'Failures']].map(([v, l]) => (
            <button key={v} onClick={() => setSortBy(v)} style={{
              padding: '4px 10px', borderRadius: 6, fontSize: 11, fontWeight: sortBy === v ? 600 : 400,
              cursor: 'pointer', border: sortBy === v ? '1px solid #60a5fa40' : '1px solid #1e293b',
              background: sortBy === v ? '#60a5fa10' : 'none', color: sortBy === v ? '#60a5fa' : '#475569',
            }}>{l}</button>
          ))}
        </div>
      </div>

      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
          <thead>
            <tr style={{ borderBottom: '1px solid #1e293b' }}>
              {['Run', 'Date', 'Branch', 'Tests', 'Passed', 'Failed', 'Sel. Heals', 'Flow Heals', 'Time Saved', 'Heal Rate', ''].map(h => (
                <th key={h} style={{ padding: '8px 12px', textAlign: h === 'Run' || h === 'Date' || h === 'Branch' ? 'left' : 'center', color: '#64748b', fontWeight: 500, fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.04em', whiteSpace: 'nowrap' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sorted.map((r, i) => {
              const passed   = (r.totalTestsCompleted || 0) - (r.totalFailures || 0);
              const healRate = parseFloat(r.healSuccessRate || 0);
              const hasFail  = (r.totalFailures || 0) > 0;
              const runUrl   = `https://github.com/${repoOwner}/${repoName}/actions/runs/${r.runId}`;
              return (
                <tr key={r.runId || i} style={{ borderBottom: '1px solid #0a1628', background: i % 2 === 0 ? 'transparent' : '#0a162815' }}>
                  <td style={{ padding: '9px 12px', color: '#94a3b8', fontWeight: 700 }}>
                    <span style={{ display: 'inline-block', width: 7, height: 7, borderRadius: '50%', background: hasFail ? '#ef4444' : '#22c55e', marginRight: 6, verticalAlign: 'middle' }} />
                    #{r.runNumber}
                  </td>
                  <td style={{ padding: '9px 12px', color: '#64748b', whiteSpace: 'nowrap' }}>{fmtDate(r.generatedAt)}</td>
                  <td style={{ padding: '9px 12px', color: '#475569', fontSize: 11 }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                      <GitBranch size={10} />{r.branch || 'main'}
                    </span>
                  </td>
                  <td style={{ padding: '9px 12px', textAlign: 'center', color: '#94a3b8' }}>{r.totalTestsCompleted ?? '—'}</td>
                  <td style={{ padding: '9px 12px', textAlign: 'center', color: '#22c55e', fontWeight: 600 }}>{passed}</td>
                  <td style={{ padding: '9px 12px', textAlign: 'center', color: hasFail ? '#ef4444' : '#475569', fontWeight: hasFail ? 700 : 400 }}>{r.totalFailures ?? 0}</td>
                  <td style={{ padding: '9px 12px', textAlign: 'center', color: r.totalSelectorHeals > 0 ? '#a78bfa' : '#475569' }}>{r.totalSelectorHeals ?? 0}</td>
                  <td style={{ padding: '9px 12px', textAlign: 'center', color: r.totalFlowHeals > 0 ? '#34d399' : '#475569' }}>{r.totalFlowHeals ?? 0}</td>
                  <td style={{ padding: '9px 12px', textAlign: 'center', color: '#f59e0b' }}>{r.estimatedTimeSaved ?? 0}h</td>
                  <td style={{ padding: '9px 12px', textAlign: 'center' }}>
                    <span style={{ fontWeight: 600, color: healRate >= 50 ? '#22c55e' : '#f59e0b' }}>{healRate}%</span>
                  </td>
                  <td style={{ padding: '9px 12px', textAlign: 'center' }}>
                    <a href={runUrl} target="_blank" rel="noopener noreferrer" style={{ color: '#475569' }}><ExternalLink size={12} /></a>
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

// ─── Workflow Stats Table ─────────────────────────────────────────────────────

function WorkflowTable({ wfStats }) {
  if (!wfStats.length) return <div style={{ color: '#475569', fontSize: 13, padding: '20px 0' }}>No workflow data.</div>;
  return (
    <div style={{ overflowX: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
        <thead>
          <tr style={{ borderBottom: '1px solid #1e293b' }}>
            {['Workflow', 'Total', 'Pass Rate', 'Passed', 'Failed', 'Avg Duration'].map(h => (
              <th key={h} style={{ padding: '8px 12px', textAlign: h === 'Workflow' ? 'left' : 'center', color: '#64748b', fontWeight: 500, fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.04em' }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {wfStats.map((wf, i) => (
            <tr key={i} style={{ borderBottom: '1px solid #0f172a' }}>
              <td style={{ padding: '10px 12px', color: '#f1f5f9', fontWeight: 500 }}>{wf.name}</td>
              <td style={{ padding: '10px 12px', textAlign: 'center', color: '#94a3b8' }}>{wf.total}</td>
              <td style={{ padding: '10px 12px', textAlign: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                  <div style={{ width: 60, height: 6, background: '#1e293b', borderRadius: 3, overflow: 'hidden' }}>
                    <div style={{ width: `${wf.passRate}%`, height: '100%', background: wf.passRate >= 80 ? '#22c55e' : wf.passRate >= 50 ? '#f59e0b' : '#ef4444', borderRadius: 3 }} />
                  </div>
                  <span style={{ color: wf.passRate >= 80 ? '#22c55e' : wf.passRate >= 50 ? '#f59e0b' : '#ef4444', fontWeight: 600 }}>{wf.passRate}%</span>
                </div>
              </td>
              <td style={{ padding: '10px 12px', textAlign: 'center', color: '#22c55e' }}>{wf.success}</td>
              <td style={{ padding: '10px 12px', textAlign: 'center', color: wf.failure > 0 ? '#ef4444' : '#64748b' }}>{wf.failure}</td>
              <td style={{ padding: '10px 12px', textAlign: 'center', color: '#94a3b8' }}>{fmtDuration(wf.avgDuration)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ─── Runs List ────────────────────────────────────────────────────────────────

function RunsList({ runs }) {
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');
  const FILTERS = ['all', 'success', 'failure', 'running', 'queued', 'cancelled'];

  const filtered = useMemo(() => {
    let r = filter === 'all' ? runs : runs.filter(r => r.status === filter);
    if (search.trim()) r = r.filter(r => r.name?.toLowerCase().includes(search.toLowerCase()) || r.branch?.toLowerCase().includes(search.toLowerCase()) || r.commitMsg?.toLowerCase().includes(search.toLowerCase()));
    return r.slice(0, 50);
  }, [runs, filter, search]);

  return (
    <div>
      <div style={{ display: 'flex', gap: 10, marginBottom: 14, flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ position: 'relative', flex: 1, minWidth: 180 }}>
          <Search size={12} color="#475569" style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)' }} />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search runs…"
            style={{ width: '100%', padding: '6px 10px 6px 30px', background: '#0a1628', border: '1px solid #1e293b', borderRadius: 8, color: '#f1f5f9', fontSize: 12, outline: 'none', boxSizing: 'border-box' }} />
        </div>
        <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
          {FILTERS.map(f => {
            const count = f === 'all' ? runs.length : runs.filter(r => r.status === f).length;
            if (f !== 'all' && count === 0) return null;
            const active = filter === f;
            return (
              <button key={f} onClick={() => setFilter(f)} style={{
                padding: '4px 12px', borderRadius: 20, fontSize: 12, fontWeight: active ? 600 : 400,
                cursor: 'pointer', border: active ? `1px solid ${STATUS_COLORS[f] || '#60a5fa'}` : '1px solid #1e293b',
                background: active ? `${STATUS_COLORS[f] || '#60a5fa'}18` : '#0f172a',
                color: active ? (STATUS_COLORS[f] || '#60a5fa') : '#64748b',
              }}>
                {f} {count > 0 && <span style={{ opacity: 0.7 }}>({count})</span>}
              </button>
            );
          })}
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
        {filtered.map(run => (
          <div key={run.id} style={{
            background: '#0a1628', border: '1px solid #1e293b', borderRadius: 10,
            padding: '11px 15px', display: 'flex', alignItems: 'center', gap: 12,
            borderLeft: `3px solid ${STATUS_COLORS[run.status] || '#334155'}`,
          }}>
            <StatusBadge status={run.status} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ color: '#f1f5f9', fontWeight: 500, fontSize: 13, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{run.name}</span>
                <span style={{ fontSize: 11, color: '#475569' }}>#{run.runNumber}</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 2, flexWrap: 'wrap' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: '#64748b' }}>
                  <GitBranch size={10} />{run.branch}
                </span>
                {run.commitSha && <span style={{ fontSize: 11, color: '#475569', fontFamily: 'monospace' }}>{run.commitSha}</span>}
                {run.commitMsg && <span style={{ fontSize: 11, color: '#475569', maxWidth: 260, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{run.commitMsg}</span>}
              </div>
            </div>
            <span style={{ fontSize: 11, color: '#64748b', whiteSpace: 'nowrap' }}>@{run.actor}</span>
            <span style={{ fontSize: 10, color: '#475569', background: '#1e293b', borderRadius: 6, padding: '2px 7px', whiteSpace: 'nowrap' }}>{run.event}</span>
            <span style={{ fontSize: 12, color: '#94a3b8', whiteSpace: 'nowrap', minWidth: 48, textAlign: 'right' }}>{fmtDuration(run.durationSec)}</span>
            <span style={{ fontSize: 11, color: '#475569', whiteSpace: 'nowrap', minWidth: 58, textAlign: 'right' }}>{timeAgo(run.startedAt)}</span>
            <a href={run.url} target="_blank" rel="noopener noreferrer" style={{ color: '#475569', flexShrink: 0 }}><ExternalLink size={13} /></a>
          </div>
        ))}
        {!filtered.length && <div style={{ textAlign: 'center', color: '#475569', padding: '28px 0', fontSize: 13 }}>No runs found.</div>}
      </div>
    </div>
  );
}

// ─── Single Repo View ─────────────────────────────────────────────────────────

function RepoView({ repoData }) {
  const [ciTab, setCiTab] = useState('runs');
  const { runs, heatmap, wfStats, summary, ciSummary, dashboardData, repoUrl, actionsUrl, owner, repo } = repoData;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Summary stat cards */}
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
        <StatCard icon={Activity}    label="CI Runs (30d)"  value={summary.totalRuns ?? '—'}  sub={`${summary.passCount ?? 0} passed · ${summary.failCount ?? 0} failed`} color="#60a5fa" />
        <StatCard icon={CheckCircle} label="CI Pass Rate"   value={summary.passRate != null ? `${summary.passRate}%` : '—'} sub="last 30 days" color={summary.passRate >= 80 ? '#22c55e' : summary.passRate >= 50 ? '#f59e0b' : '#ef4444'} />
        <StatCard icon={Clock}       label="Avg Duration"   value={fmtDuration(summary.avgDuration)} sub="per run" color="#a78bfa" />
        <StatCard icon={Flame}       label="Pass Streak"    value={summary.streak ?? 0} sub={summary.streak > 0 ? 'consecutive passes' : 'broken'} color={summary.streak > 5 ? '#f59e0b' : summary.streak > 0 ? '#22c55e' : '#ef4444'} />
        {summary.lastRun && (
          <StatCard
            icon={summary.lastRun.status === 'success' ? CheckCircle : XCircle}
            label="Latest CI Run"
            value={<StatusBadge status={summary.lastRun.status} />}
            sub={timeAgo(summary.lastRun.startedAt)}
            color={STATUS_COLORS[summary.lastRun.status] || '#64748b'}
          />
        )}
      </div>

      {/* Healing Metrics (latest + all-time) */}
      <HealingMetrics ciSummary={ciSummary} dashboardData={dashboardData} repoUrl={repoUrl} />

      {/* Test Case Breakdown — collapsible */}
      {dashboardData?.latest?.runs?.length > 0 && (
        <CollapsibleSection
          title="Test Case Breakdown"
          icon={<TestTube size={14} color="#a78bfa" />}
          count={dashboardData.latest.runs.length}
          defaultOpen={true}
          badge={
            <span style={{ fontSize: 10, background: '#a78bfa20', color: '#a78bfa', border: '1px solid #a78bfa40', borderRadius: 6, padding: '1px 7px', marginLeft: 4 }}>
              Latest run
            </span>
          }
        >
          <TestCaseTable runs={dashboardData.latest.runs} />
        </CollapsibleSection>
      )}

      {/* Run History — collapsible */}
      {dashboardData?.history?.length > 0 && (
        <CollapsibleSection
          title="Run History"
          icon={<History size={14} color="#60a5fa" />}
          count={dashboardData.history.length}
          defaultOpen={true}
        >
          <RunHistoryTable history={dashboardData.history} repoOwner={owner} repoName={repo} />
        </CollapsibleSection>
      )}

      {/* Activity chart — collapsible, full width */}
      <CollapsibleSection
        title="Activity — Last 30 Days"
        icon={<Activity size={14} color="#60a5fa" />}
        defaultOpen={false}
      >
        <ActivityChart heatmap={heatmap} />
      </CollapsibleSection>

      {/* CI Runs & Workflows — collapsible */}
      <CollapsibleSection
        title="GitHub Actions Runs"
        icon={<GitBranch size={14} color="#64748b" />}
        count={runs.length}
        defaultOpen={false}
        badge={
          <a href={actionsUrl} target="_blank" rel="noopener noreferrer"
            style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: '#475569', marginLeft: 8, textDecoration: 'none' }}
            onClick={e => e.stopPropagation()}>
            <ExternalLink size={10} /> GitHub Actions
          </a>
        }
      >
        <div style={{ display: 'flex', borderBottom: '1px solid #1e293b', marginBottom: 14 }}>
          {[{ id: 'runs', label: `Runs (${runs.length})` }, { id: 'workflows', label: `Workflows (${wfStats.length})` }].map(t => (
            <button key={t.id} onClick={() => setCiTab(t.id)} style={{
              padding: '10px 18px', fontSize: 13, fontWeight: ciTab === t.id ? 600 : 400,
              color: ciTab === t.id ? '#f1f5f9' : '#64748b',
              background: 'none', border: 'none', cursor: 'pointer',
              borderBottom: ciTab === t.id ? '2px solid #60a5fa' : '2px solid transparent',
            }}>{t.label}</button>
          ))}
        </div>
        {ciTab === 'runs'      && <RunsList runs={runs} />}
        {ciTab === 'workflows' && <WorkflowTable wfStats={wfStats} />}
      </CollapsibleSection>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function SelfHealingPipeline({ data }) {
  const [activeRepo, setActiveRepo] = useState(0);

  if (!data || !data.repos?.length) {
    return (
      <div style={{ padding: '60px 0', textAlign: 'center', color: '#475569' }}>
        <Activity size={32} style={{ marginBottom: 12, opacity: 0.4 }} />
        <div style={{ fontSize: 14 }}>Loading self-healing pipeline data…</div>
      </div>
    );
  }

  const { repos, fetchedAt } = data;
  const current = repos[activeRepo] || repos[0];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Zap size={20} color="#f59e0b" />
            <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: '#f1f5f9' }}>Self-Healing Automation Pipeline</h2>
          </div>
          <div style={{ marginTop: 3, fontSize: 12, color: '#475569' }}>
            {repos.length} repo{repos.length !== 1 ? 's' : ''} tracked
            {fetchedAt && ` · Updated ${timeAgo(fetchedAt)}`}
          </div>
        </div>
      </div>

      {/* Repo Tabs */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        {repos.map((r, i) => {
          const active = activeRepo === i;
          const hasRunning = r.runs.some(run => run.status === 'running');
          return (
            <button key={i} onClick={() => setActiveRepo(i)} style={{
              display: 'flex', alignItems: 'center', gap: 8, padding: '8px 18px',
              borderRadius: 10, cursor: 'pointer',
              background: active ? '#1e293b' : '#0f172a',
              border: active ? '1px solid #60a5fa' : '1px solid #1e293b',
              color: active ? '#f1f5f9' : '#64748b',
              fontWeight: active ? 600 : 400, fontSize: 13, transition: 'all 0.15s',
            }}>
              <span>{r.label}</span>
              {hasRunning && (
                <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#60a5fa', display: 'inline-block', animation: 'pulse 1.4s infinite' }} />
              )}
              {r.dashboardData && (
                <span style={{ fontSize: 10, background: '#22c55e20', color: '#22c55e', border: '1px solid #22c55e40', borderRadius: 8, padding: '1px 6px' }}>Live Data</span>
              )}
              {!r.dashboardData && r.ciSummary && (
                <span style={{ fontSize: 10, background: '#60a5fa20', color: '#60a5fa', border: '1px solid #60a5fa40', borderRadius: 8, padding: '1px 6px' }}>Metrics</span>
              )}
            </button>
          );
        })}
      </div>

      {current && <RepoView key={current.repo} repoData={current} />}

      <style>{`
        @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.3; } }
        input::placeholder { color: #475569; }
      `}</style>
    </div>
  );
}
