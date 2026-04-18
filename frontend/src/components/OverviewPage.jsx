import React from 'react';
import { GitBranch, Bug, TestTube, AlertTriangle, ChevronRight, Zap } from 'lucide-react';

const STATUS_COLORS = {
  success: '#22c55e', failure: '#ef4444', running: '#60a5fa',
  queued: '#94a3b8', cancelled: '#64748b', pending: '#f59e0b',
};

function StatusDot({ status }) {
  return (
    <span style={{
      width: 8, height: 8, borderRadius: '50%',
      background: STATUS_COLORS[status] || '#475569',
      display: 'inline-block', flexShrink: 0,
    }} />
  );
}

function MetricBlock({ label, value, color }) {
  return (
    <div>
      <p style={{ color: '#64748b', fontSize: 10, marginBottom: 2, textTransform: 'uppercase', letterSpacing: 0.5 }}>{label}</p>
      <p style={{ fontSize: 26, fontWeight: 700, color: color || '#e2e8f0', lineHeight: 1 }}>{value}</p>
    </div>
  );
}

function Panel({ accent, icon, title, badge, metrics, children, footer, onClick }) {
  const [hovered, setHovered] = React.useState(false);
  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: '#1e293b',
        border: `1px solid ${hovered ? accent : '#334155'}`,
        borderRadius: 12, padding: 20, cursor: 'pointer',
        transition: 'border-color 0.15s',
        display: 'flex', flexDirection: 'column',
      }}
    >
      {/* Panel header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
            {icon}
            <span style={{ fontSize: 14, fontWeight: 700, color: '#e2e8f0' }}>{title}</span>
          </div>
          <span style={{
            fontSize: 11, color: accent, background: `${accent}18`,
            borderRadius: 4, padding: '2px 7px', fontWeight: 600,
          }}>
            {badge}
          </span>
        </div>
        <ChevronRight size={14} color="#475569" />
      </div>

      {/* Metric blocks */}
      <div style={{ display: 'flex', gap: 20, marginBottom: 16, flexWrap: 'wrap' }}>
        {metrics}
      </div>

      {/* Detail rows */}
      <div style={{ borderTop: '1px solid #0f172a', paddingTop: 12, flex: 1 }}>
        {children}
      </div>

      {/* Footer CTA */}
      <div style={{ marginTop: 14, display: 'flex', alignItems: 'center', gap: 4, color: accent, fontSize: 12, fontWeight: 500 }}>
        <span>{footer}</span>
        <ChevronRight size={12} />
      </div>
    </div>
  );
}

const JIRA_PROJECTS = [
  { key: 'KAFKA', label: 'Apache Kafka' },
  { key: 'HADOOP', label: 'Apache Hadoop' },
  { key: 'SPARK', label: 'Apache Spark' },
];

export default function OverviewPage({ ciRuns, heatmapData, jiraData, testData, bottlenecks, onNavigate }) {
  const { allIssues = [], metrics = {} } = jiraData;

  // CI metrics
  const recent = ciRuns.slice(0, 40);
  const ciPassRate = recent.length
    ? Math.round(recent.filter(r => r.status === 'success').length / recent.length * 100)
    : 0;
  const runningCount = recent.filter(r => r.status === 'running').length;
  const repoStatuses = heatmapData.slice(0, 6).map(row => ({
    name: row.module,
    status: row.slots?.[0]?.status || 'unknown',
    passRate: row.passRate,
  }));

  // Jira metrics
  const openBugs = metrics.openBugs ?? 0;
  const criticalBugs = metrics.criticalBugs ?? 0;

  // Test metrics
  const testPassRate = testData.summary?.overallPassRate ?? 0;
  const totalTests = testData.summary?.total ?? 0;
  const totalCycles = testData.testCycles?.length ?? 0;

  // Bottlenecks
  const criticalBns = bottlenecks.filter(b => b.severity === 'critical').slice(0, 3);
  const highBns = bottlenecks.filter(b => b.severity === 'high').slice(0, 2);

  return (
    <div>
      {/* Page title */}
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 20, fontWeight: 700, color: '#e2e8f0', marginBottom: 6 }}>
          Project Quality Overview
        </h1>
        <p style={{ color: '#64748b', fontSize: 13, lineHeight: 1.5 }}>
          Real-time quality signal across open source projects &mdash;&nbsp;
          <span style={{ color: '#f59e0b' }}>Apache Kafka · Apache Hadoop · Apache Spark</span>
          &nbsp;(JIRA)&nbsp;&nbsp;·&nbsp;&nbsp;
          <span style={{ color: '#6366f1' }}>Open Source CI Pipelines</span>
          &nbsp;&nbsp;·&nbsp;&nbsp;
          <span style={{ color: '#60a5fa' }}>Zephyr Test Cycles</span>
        </p>
      </div>

      {/* 3-column panels */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 20 }}>

        {/* CI Panel */}
        <Panel
          accent="#6366f1"
          icon={<GitBranch size={16} color="#6366f1" />}
          title="CI Pipelines"
          badge="Open Source CI Pipelines"
          metrics={
            <>
              <MetricBlock
                label="Pass Rate"
                value={`${ciPassRate}%`}
                color={ciPassRate >= 80 ? '#22c55e' : ciPassRate >= 60 ? '#f59e0b' : '#ef4444'}
              />
              <MetricBlock label="Runs" value={recent.length} />
              {runningCount > 0 && <MetricBlock label="Running" value={runningCount} color="#60a5fa" />}
            </>
          }
          footer="View CI Details"
          onClick={() => onNavigate('heatmap')}
        >
          <p style={{ color: '#475569', fontSize: 11, marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.4 }}>Repositories</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {repoStatuses.length === 0 ? (
              <span style={{ color: '#475569', fontSize: 12 }}>Loading…</span>
            ) : repoStatuses.map(repo => (
              <div key={repo.name} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <StatusDot status={repo.status} />
                  <span style={{ color: '#94a3b8', fontSize: 12 }}>{repo.name}</span>
                </div>
                {repo.passRate !== undefined && (
                  <span style={{
                    color: repo.passRate >= 80 ? '#22c55e' : repo.passRate >= 60 ? '#f59e0b' : '#ef4444',
                    fontSize: 11, fontWeight: 600,
                  }}>
                    {repo.passRate}%
                  </span>
                )}
              </div>
            ))}
          </div>
        </Panel>

        {/* JIRA Panel */}
        <Panel
          accent="#f59e0b"
          icon={<Bug size={16} color="#f59e0b" />}
          title="JIRA Board"
          badge="Apache Projects — JIRA"
          metrics={
            <>
              <MetricBlock
                label="Open Bugs"
                value={openBugs}
                color={openBugs > 10 ? '#ef4444' : '#f59e0b'}
              />
              {criticalBugs > 0 && <MetricBlock label="Critical" value={criticalBugs} color="#ef4444" />}
              <MetricBlock label="Total Issues" value={allIssues.length} />
            </>
          }
          footer="View JIRA Board"
          onClick={() => onNavigate('jira')}
        >
          <p style={{ color: '#475569', fontSize: 11, marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.4 }}>Projects</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
            {JIRA_PROJECTS.map(({ key, label }) => {
              const count = allIssues.filter(i => i.key?.startsWith(key + '-')).length;
              return (
                <div key={key} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{
                      fontSize: 11, fontWeight: 700, color: '#f59e0b',
                      background: '#f59e0b15', borderRadius: 4, padding: '1px 7px',
                    }}>
                      {key}
                    </span>
                    <span style={{ color: '#475569', fontSize: 11 }}>JIRA · {label}</span>
                  </div>
                  <span style={{ color: '#94a3b8', fontSize: 11 }}>{count} issues</span>
                </div>
              );
            })}
          </div>
        </Panel>

        {/* Test Results Panel */}
        <Panel
          accent="#60a5fa"
          icon={<TestTube size={16} color="#60a5fa" />}
          title="Test Results"
          badge="Zephyr Test Cycles"
          metrics={
            <>
              <MetricBlock
                label="Pass Rate"
                value={`${testPassRate}%`}
                color={testPassRate >= 80 ? '#22c55e' : testPassRate >= 60 ? '#f59e0b' : '#ef4444'}
              />
              <MetricBlock label="Tests" value={totalTests} />
              <MetricBlock label="Cycles" value={totalCycles} />
            </>
          }
          footer="View Test Results"
          onClick={() => onNavigate('tests')}
        >
          <p style={{ color: '#475569', fontSize: 11, marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.4 }}>Test Cycles</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {testData.testCycles?.length === 0 || !testData.testCycles ? (
              <span style={{ color: '#475569', fontSize: 12 }}>No active cycles</span>
            ) : testData.testCycles.slice(0, 5).map(cycle => {
              const passRate = cycle.summary?.passRate ?? 0;
              return (
                <div key={cycle.id || cycle.key} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ color: '#94a3b8', fontSize: 12, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '75%' }}>
                    {cycle.name || cycle.key}
                  </span>
                  <span style={{
                    color: passRate >= 80 ? '#22c55e' : passRate >= 60 ? '#f59e0b' : '#ef4444',
                    fontSize: 11, fontWeight: 600,
                  }}>
                    {passRate}%
                  </span>
                </div>
              );
            })}
          </div>
        </Panel>
      </div>

      {/* Bottlenecks alert strip */}
      {(criticalBns.length > 0 || highBns.length > 0) && (
        <div
          onClick={() => onNavigate('bottlenecks')}
          style={{
            background: '#1e293b',
            border: `1px solid ${criticalBns.length > 0 ? '#ef444440' : '#f97316_40'}`,
            borderColor: criticalBns.length > 0 ? '#ef444440' : '#f9741640',
            borderRadius: 12, padding: 16, cursor: 'pointer',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
            <AlertTriangle size={15} color={criticalBns.length > 0 ? '#ef4444' : '#f97316'} />
            <span style={{ fontSize: 13, fontWeight: 600, color: criticalBns.length > 0 ? '#ef4444' : '#f97316' }}>
              {criticalBns.length > 0 ? 'Critical Bottlenecks Detected' : 'High Priority Issues'}
            </span>
            <span style={{
              background: criticalBns.length > 0 ? '#ef4444' : '#f97316',
              color: '#fff', borderRadius: 10, padding: '1px 6px', fontSize: 11,
            }}>
              {bottlenecks.filter(b => b.severity === 'critical' || b.severity === 'high').length}
            </span>
            <span style={{ marginLeft: 'auto', color: '#475569', fontSize: 12 }}>View all bottlenecks →</span>
          </div>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            {[...criticalBns, ...highBns].map(b => (
              <div key={b.id} style={{ background: '#0f172a', borderRadius: 8, padding: '10px 14px', flex: '1 1 200px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                  <span style={{
                    fontSize: 10, fontWeight: 700,
                    color: b.severity === 'critical' ? '#ef4444' : '#f97316',
                    background: b.severity === 'critical' ? '#ef444420' : '#f9731620',
                    borderRadius: 4, padding: '1px 5px', textTransform: 'uppercase',
                  }}>
                    {b.severity}
                  </span>
                  <span style={{ color: '#94a3b8', fontSize: 11 }}>{b.type}</span>
                </div>
                <p style={{ color: '#e2e8f0', fontSize: 12, fontWeight: 600, marginBottom: 3 }}>{b.title}</p>
                <p style={{ color: '#64748b', fontSize: 11 }}>{b.module} — {b.metric}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Empty bottleneck state */}
      {bottlenecks.length === 0 && (
        <div style={{ background: '#1e293b', border: '1px solid #22c55e30', borderRadius: 12, padding: 16, display: 'flex', alignItems: 'center', gap: 10 }}>
          <Zap size={16} color="#22c55e" />
          <span style={{ color: '#22c55e', fontSize: 13, fontWeight: 500 }}>No bottlenecks detected — all systems healthy</span>
        </div>
      )}
    </div>
  );
}
