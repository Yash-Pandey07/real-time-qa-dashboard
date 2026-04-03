import React, { useState } from 'react';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { CheckCircle, XCircle, MinusCircle, Clock, ExternalLink, ChevronDown, ChevronRight } from 'lucide-react';

const STATUS_COLORS = {
  Pass:           '#22c55e',
  Fail:           '#ef4444',
  Blocked:        '#f97316',
  'Not Executed': '#64748b',
  'In Progress':  '#60a5fa',
};

function StatusIcon({ status }) {
  if (status === 'Pass')     return <CheckCircle size={13} color="#22c55e" />;
  if (status === 'Fail')     return <XCircle size={13} color="#ef4444" />;
  if (status === 'Blocked')  return <MinusCircle size={13} color="#f97316" />;
  return <Clock size={13} color="#64748b" />;
}

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

function CycleCard({ cycle }) {
  const [expanded, setExpanded] = useState(false);
  const pieData = [
    { name: 'Pass',           value: cycle.passCount        || 0 },
    { name: 'Fail',           value: cycle.failCount        || 0 },
    { name: 'Blocked',        value: cycle.blockedCount     || 0 },
    { name: 'Not Executed',   value: cycle.notExecutedCount || 0 },
    { name: 'In Progress',    value: cycle.inProgressCount  || 0 },
  ].filter(d => d.value > 0);

  const passColor = cycle.passRate >= 80 ? '#22c55e' : cycle.passRate >= 60 ? '#f59e0b' : '#ef4444';

  return (
    <div style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 10, padding: 16, marginBottom: 12 }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16, flexWrap: 'wrap' }}>
        {/* Donut */}
        <div style={{ width: 120, height: 120, flexShrink: 0 }}>
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie data={pieData} cx="50%" cy="50%" innerRadius={30} outerRadius={50} dataKey="value" paddingAngle={2}>
                {pieData.map((entry, i) => (
                  <Cell key={i} fill={STATUS_COLORS[entry.name] || '#334155'} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 8, fontSize: 12, boxShadow: '0 4px 12px rgba(0,0,0,0.5)' }}
                labelStyle={{ color: '#e2e8f0', fontWeight: 600, marginBottom: 4 }}
                itemStyle={{ color: '#94a3b8' }}
                formatter={(value, name) => [value, name]}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Info */}
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <div style={{ fontWeight: 600, color: '#e2e8f0', marginBottom: 2 }}>{cycle.name}</div>
              <div style={{ color: '#64748b', fontSize: 11 }}>{cycle.key} · {cycle.repoLabel}</div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: 24, fontWeight: 700, color: passColor }}>{cycle.passRate}%</div>
              <div style={{ color: '#64748b', fontSize: 11 }}>pass rate</div>
            </div>
          </div>

          {/* Stat chips */}
          <div style={{ display: 'flex', gap: 8, marginTop: 10, flexWrap: 'wrap' }}>
            {[
              { label: 'Total',   val: cycle.totalCount,       color: '#94a3b8' },
              { label: 'Pass',    val: cycle.passCount,        color: '#22c55e' },
              { label: 'Fail',    val: cycle.failCount,        color: '#ef4444' },
              { label: 'Blocked', val: cycle.blockedCount,     color: '#f97316' },
              { label: 'N/A',     val: cycle.notExecutedCount, color: '#64748b' },
            ].map(chip => (
              <span key={chip.label} style={{
                background: '#0f172a', border: `1px solid #334155`,
                borderRadius: 6, padding: '3px 8px', fontSize: 11,
              }}>
                <span style={{ color: '#64748b' }}>{chip.label} </span>
                <span style={{ color: chip.color, fontWeight: 600 }}>{chip.val ?? 0}</span>
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Expand / JSON */}
      <button
        onClick={() => setExpanded(e => !e)}
        style={{
          display: 'flex', alignItems: 'center', gap: 4, marginTop: 10,
          background: 'none', border: 'none', color: '#6366f1', cursor: 'pointer', fontSize: 12, padding: 0,
        }}
      >
        {expanded ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
        {expanded ? 'Hide raw Zephyr data' : 'Show raw Zephyr data'}
      </button>
      {expanded && (
        <pre style={{
          marginTop: 8, background: '#0f172a', border: '1px solid #334155',
          borderRadius: 6, padding: 12, fontSize: 10, color: '#94a3b8',
          overflow: 'auto', maxHeight: 200,
        }}>
          {JSON.stringify(cycle, null, 2)}
        </pre>
      )}
    </div>
  );
}

function ExecutionRow({ exec }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 12, padding: '8px 14px',
      borderBottom: '1px solid #0f172a', fontSize: 13,
    }}>
      <StatusIcon status={exec.status} />
      <div style={{ flex: 1, overflow: 'hidden' }}>
        <div style={{ color: '#e2e8f0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {exec.testCase?.name || exec.key}
        </div>
        <div style={{ color: '#64748b', fontSize: 11 }}>{exec.testCycleKey}</div>
      </div>
      <span style={{
        background: `${STATUS_COLORS[exec.status] || '#94a3b8'}20`,
        color: STATUS_COLORS[exec.status] || '#94a3b8',
        border: `1px solid ${STATUS_COLORS[exec.status] || '#94a3b8'}40`,
        borderRadius: 10, padding: '1px 8px', fontSize: 11, fontWeight: 600,
      }}>{exec.status}</span>
      <span style={{ color: '#64748b', fontSize: 11, minWidth: 50, textAlign: 'right' }}>
        {fmtDuration(exec.durationSec)}
      </span>
      <span style={{ color: '#475569', fontSize: 11, minWidth: 60, textAlign: 'right' }}>
        {timeAgo(exec.startedAt)}
      </span>
      {exec.url && (
        <a href={exec.url} target="_blank" rel="noreferrer" style={{ color: '#6366f1' }}>
          <ExternalLink size={12} />
        </a>
      )}
    </div>
  );
}

export default function TestResults({ testData = {} }) {
  const [tab, setTab] = useState('cycles');
  const { testCycles = [], testExecutions = [], summary = {} } = testData;

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <h2 style={{ fontSize: 16, fontWeight: 600, color: '#e2e8f0' }}>Test Results (Zephyr Format)</h2>
        <div style={{ display: 'flex', gap: 6 }}>
          {['cycles', 'executions'].map(t => (
            <button key={t} onClick={() => setTab(t)} style={{
              padding: '5px 14px', borderRadius: 6, fontSize: 12, cursor: 'pointer',
              background: tab === t ? '#6366f1' : 'transparent',
              border: `1px solid ${tab === t ? '#6366f1' : '#334155'}`,
              color: tab === t ? '#fff' : '#94a3b8', textTransform: 'capitalize',
            }}>{t}</button>
          ))}
        </div>
      </div>

      {/* Summary bar */}
      {summary.totalExecutions > 0 && (
        <div style={{ display: 'flex', gap: 16, marginBottom: 16, flexWrap: 'wrap' }}>
          {[
            { label: 'Cycles',     val: summary.totalCycles     },
            { label: 'Total',      val: summary.totalExecutions },
            { label: 'Pass',       val: summary.totalPass,   color: '#22c55e' },
            { label: 'Fail',       val: summary.totalFail,   color: '#ef4444' },
            { label: 'Pass Rate',  val: `${summary.overallPassRate}%`,
              color: summary.overallPassRate >= 80 ? '#22c55e' : summary.overallPassRate >= 60 ? '#f59e0b' : '#ef4444' },
          ].map(chip => (
            <div key={chip.label} style={{
              background: '#1e293b', border: '1px solid #334155', borderRadius: 8,
              padding: '8px 14px', minWidth: 80, textAlign: 'center',
            }}>
              <div style={{ fontSize: 18, fontWeight: 700, color: chip.color || '#e2e8f0' }}>{chip.val ?? 0}</div>
              <div style={{ fontSize: 11, color: '#64748b', marginTop: 2 }}>{chip.label}</div>
            </div>
          ))}
        </div>
      )}

      {tab === 'cycles' && (
        testCycles.length === 0
          ? <div style={{ color: '#475569', textAlign: 'center', padding: 60 }}>No test cycle data yet...</div>
          : testCycles.map(c => <CycleCard key={c.key} cycle={c} />)
      )}

      {tab === 'executions' && (
        <div style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 10, overflow: 'hidden' }}>
          {testExecutions.length === 0
            ? <div style={{ color: '#475569', textAlign: 'center', padding: 40 }}>No execution data yet...</div>
            : testExecutions.slice(0, 100).map(e => <ExecutionRow key={e.key} exec={e} />)
          }
        </div>
      )}
    </div>
  );
}
