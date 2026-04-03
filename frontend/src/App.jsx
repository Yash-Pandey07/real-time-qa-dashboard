import React, { useState, useEffect, useCallback } from 'react';
import { Analytics } from '@vercel/analytics/react';
import { useWebSocket } from './hooks/useWebSocket.js';
import Header from './components/Header.jsx';
import SummaryCards from './components/SummaryCards.jsx';
import HeatMap from './components/HeatMap.jsx';
import CIPipeline from './components/CIPipeline.jsx';
import JiraBoard from './components/JiraBoard.jsx';
import TestResults from './components/TestResults.jsx';
import Bottlenecks from './components/Bottlenecks.jsx';

const API_BASE = import.meta.env.VITE_API_URL || '';

const NAV_ITEMS = [
  { id: 'heatmap',     label: 'Heat Map' },
  { id: 'pipeline',    label: 'CI Pipeline' },
  { id: 'jira',        label: 'Jira Board' },
  { id: 'tests',       label: 'Test Results' },
  { id: 'bottlenecks', label: 'Bottlenecks' },
];

export default function App() {
  const [connected, setConnected]           = useState(false);
  const [activeSection, setActiveSection]   = useState('heatmap');
  const [lastUpdated, setLastUpdated]       = useState(null);
  const [ciRuns, setCiRuns]                 = useState([]);
  const [heatmapData, setHeatmapData]       = useState([]);
  const [jiraData, setJiraData]             = useState({ allIssues: [], metrics: {}, projects: [] });
  const [testData, setTestData]             = useState({ testCycles: [], testExecutions: [], summary: {} });
  const [bottlenecks, setBottlenecks]       = useState([]);

  const onMessage = useCallback((type, payload) => {
    if (type === 'ci:update') {
      setCiRuns(payload.runs || []);
      setLastUpdated(payload.fetchedAt);
    } else if (type === 'jira:update') {
      setJiraData({ allIssues: payload.allIssues || [], metrics: payload.metrics || {}, projects: payload.projects || [] });
    } else if (type === 'tests:update') {
      setTestData({ testCycles: payload.testCycles || [], testExecutions: payload.testExecutions || [], summary: payload.summary || {} });
    } else if (type === 'bottlenecks:update') {
      setBottlenecks(payload.bottlenecks || []);
    }
  }, []);

  useWebSocket({
    onConnectionChange: setConnected,
    onMessage,
  });

  // Bootstrap via REST on mount
  useEffect(() => {
    fetch(`${API_BASE}/api/ci/runs?limit=100`).then(r => r.json()).then(d => { if (d.runs) setCiRuns(d.runs); }).catch(() => {});
    fetch(`${API_BASE}/api/ci/heatmap`).then(r => r.json()).then(d => { if (d.grid) setHeatmapData(d.grid); }).catch(() => {});
    fetch(`${API_BASE}/api/jira/issues?limit=50`).then(r => r.json()).then(d => {
      if (d.issues) setJiraData(prev => ({ ...prev, allIssues: d.issues, metrics: d.metrics || {} }));
    }).catch(() => {});
    fetch(`${API_BASE}/api/jira/projects`).then(r => r.json()).then(d => {
      if (d.projects) setJiraData(prev => ({ ...prev, projects: d.projects }));
    }).catch(() => {});
    fetch(`${API_BASE}/api/tests/cycles`).then(r => r.json()).then(d => {
      if (d.testCycles) setTestData(prev => ({ ...prev, testCycles: d.testCycles, summary: d.summary || {} }));
    }).catch(() => {});
    fetch(`${API_BASE}/api/tests/executions?limit=100`).then(r => r.json()).then(d => {
      if (d.testExecutions) setTestData(prev => ({ ...prev, testExecutions: d.testExecutions }));
    }).catch(() => {});
    fetch(`${API_BASE}/api/bottlenecks`).then(r => r.json()).then(d => {
      if (d.bottlenecks) setBottlenecks(d.bottlenecks);
    }).catch(() => {});
  }, []);

  // Keep heatmap in sync when ciRuns update
  useEffect(() => {
    fetch(`${API_BASE}/api/ci/heatmap`).then(r => r.json()).then(d => { if (d.grid) setHeatmapData(d.grid); }).catch(() => {});
  }, [ciRuns]);

  const handleRefresh = () => {
    fetch(`${API_BASE}/api/refresh`, { method: 'POST' }).catch(() => {});
  };

  const ciPassRate = (() => {
    const recent = ciRuns.slice(0, 40);
    if (!recent.length) return 0;
    return Math.round(recent.filter(r => r.status === 'success').length / recent.length * 100);
  })();

  const testPassRate = testData.summary?.overallPassRate ?? 0;
  const openBugs     = jiraData.metrics?.openBugs ?? 0;
  const criticalCount = bottlenecks.filter(b => b.severity === 'critical').length;

  return (
    <div style={{ minHeight: '100vh', background: '#0f172a', color: '#e2e8f0' }}>
      <Header connected={connected} lastUpdated={lastUpdated} onRefresh={handleRefresh} />

      <SummaryCards
        ciPassRate={ciPassRate}
        openBugs={openBugs}
        testPassRate={testPassRate}
        bottleneckCount={bottlenecks.length}
        criticalCount={criticalCount}
      />

      {/* Navigation */}
      <div style={{ display: 'flex', gap: 4, padding: '0 24px 0', borderBottom: '1px solid #1e293b', overflowX: 'auto' }}>
        {NAV_ITEMS.map(item => (
          <button
            key={item.id}
            onClick={() => setActiveSection(item.id)}
            style={{
              padding: '10px 18px',
              background: 'none',
              border: 'none',
              borderBottom: activeSection === item.id ? '2px solid #6366f1' : '2px solid transparent',
              color: activeSection === item.id ? '#e2e8f0' : '#64748b',
              cursor: 'pointer',
              fontSize: 14,
              fontWeight: activeSection === item.id ? 600 : 400,
              whiteSpace: 'nowrap',
              transition: 'color 0.15s',
            }}
          >
            {item.label}
            {item.id === 'bottlenecks' && bottlenecks.length > 0 && (
              <span style={{ marginLeft: 6, background: criticalCount > 0 ? '#ef4444' : '#f97316', color: '#fff', borderRadius: 10, padding: '1px 6px', fontSize: 11 }}>
                {bottlenecks.length}
              </span>
            )}
          </button>
        ))}
      </div>

      <div style={{ padding: '24px' }}>
        {activeSection === 'heatmap'     && <HeatMap grid={heatmapData} />}
        {activeSection === 'pipeline'    && <CIPipeline runs={ciRuns} />}
        {activeSection === 'jira'        && <JiraBoard jiraData={jiraData} />}
        {activeSection === 'tests'       && <TestResults testData={testData} />}
        {activeSection === 'bottlenecks' && <Bottlenecks bottlenecks={bottlenecks} onNavigate={setActiveSection} />}
      </div>
      <Analytics />
    </div>
  );
}
