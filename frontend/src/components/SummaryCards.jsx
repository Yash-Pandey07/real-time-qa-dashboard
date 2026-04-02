import React from 'react';
import { CheckCircle, Bug, TestTube, AlertTriangle } from 'lucide-react';

function Card({ icon, label, value, sub, color, bg }) {
  return (
    <div style={{
      background: '#1e293b', border: `1px solid #334155`,
      borderRadius: 10, padding: '20px 24px', flex: 1, minWidth: 180,
      borderLeft: `4px solid ${color}`,
    }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <div>
          <p style={{ color: '#64748b', fontSize: 12, fontWeight: 500, marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.5 }}>
            {label}
          </p>
          <p style={{ fontSize: 32, fontWeight: 700, color, lineHeight: 1 }}>{value}</p>
          {sub && <p style={{ color: '#64748b', fontSize: 12, marginTop: 6 }}>{sub}</p>}
        </div>
        <div style={{ background: bg, padding: 10, borderRadius: 8 }}>
          {icon}
        </div>
      </div>
    </div>
  );
}

export default function SummaryCards({ ciPassRate, openBugs, testPassRate, bottleneckCount, criticalCount }) {
  return (
    <div style={{ display: 'flex', gap: 16, padding: '20px 24px', flexWrap: 'wrap' }}>
      <Card
        icon={<CheckCircle size={20} color="#22c55e" />}
        label="CI Pass Rate"
        value={`${ciPassRate}%`}
        sub="Last 40 pipeline runs"
        color={ciPassRate >= 80 ? '#22c55e' : ciPassRate >= 60 ? '#f59e0b' : '#ef4444'}
        bg="rgba(34,197,94,0.1)"
      />
      <Card
        icon={<Bug size={20} color="#ef4444" />}
        label="Open Bugs"
        value={openBugs}
        sub="Across all Jira projects"
        color="#ef4444"
        bg="rgba(239,68,68,0.1)"
      />
      <Card
        icon={<TestTube size={20} color="#60a5fa" />}
        label="Test Pass Rate"
        value={`${testPassRate}%`}
        sub="Active test cycles"
        color={testPassRate >= 80 ? '#22c55e' : testPassRate >= 60 ? '#f59e0b' : '#ef4444'}
        bg="rgba(96,165,250,0.1)"
      />
      <Card
        icon={<AlertTriangle size={20} color="#f59e0b" />}
        label="Bottlenecks"
        value={
          <span>
            {bottleneckCount}
            {criticalCount > 0 && (
              <span style={{ fontSize: 14, background: '#ef4444', color: '#fff', borderRadius: 8, padding: '2px 8px', marginLeft: 8, verticalAlign: 'middle' }}>
                {criticalCount} critical
              </span>
            )}
          </span>
        }
        sub="AI-detected issues"
        color={criticalCount > 0 ? '#ef4444' : bottleneckCount > 0 ? '#f59e0b' : '#22c55e'}
        bg="rgba(245,158,11,0.1)"
      />
    </div>
  );
}
