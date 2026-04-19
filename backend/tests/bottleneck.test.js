const { detectBottlenecks } = require('../services/bottleneck');

// Helper: create a CI run timestamped within the last hour (within lookback window)
function makeRun(status, durationSec = 60, minutesAgo = 10, repoLabel = 'my-repo') {
  return {
    id: Math.random().toString(36).slice(2),
    repoLabel,
    status,
    durationSec,
    startedAt: new Date(Date.now() - minutesAgo * 60 * 1000).toISOString(),
  };
}

// ─── CI Rules ────────────────────────────────────────────────────────────────

describe('bottleneck — CI: high failure rate', () => {
  test('flags ≥50% failure rate across ≥3 runs as HIGH', () => {
    const runs = [makeRun('failure'), makeRun('failure'), makeRun('success')];
    const result = detectBottlenecks(runs, {}, {});
    const found = result.find(b => b.type === 'ci_failure_rate');
    expect(found).toBeDefined();
    expect(found.severity).toBe('high');
  });

  test('flags ≥80% failure rate as CRITICAL', () => {
    const runs = [makeRun('failure'), makeRun('failure'), makeRun('failure'), makeRun('failure'), makeRun('success')];
    const result = detectBottlenecks(runs, {}, {});
    const found = result.find(b => b.type === 'ci_failure_rate');
    expect(found).toBeDefined();
    expect(found.severity).toBe('critical');
  });

  test('does NOT flag when <3 total runs', () => {
    const runs = [makeRun('failure'), makeRun('failure')];
    const result = detectBottlenecks(runs, {}, {});
    expect(result.find(b => b.type === 'ci_failure_rate')).toBeUndefined();
  });

  test('does NOT flag when <50% failure rate', () => {
    const runs = [makeRun('failure'), makeRun('success'), makeRun('success'), makeRun('success')];
    const result = detectBottlenecks(runs, {}, {});
    expect(result.find(b => b.type === 'ci_failure_rate')).toBeUndefined();
  });
});

describe('bottleneck — CI: consecutive failures', () => {
  test('flags 3+ consecutive failures as CRITICAL', () => {
    const runs = [makeRun('failure', 60, 1), makeRun('failure', 60, 5), makeRun('failure', 60, 10)];
    const result = detectBottlenecks(runs, {}, {});
    const found = result.find(b => b.type === 'consecutive_failures');
    expect(found).toBeDefined();
    expect(found.severity).toBe('critical');
  });

  test('does NOT flag when last run succeeded', () => {
    const runs = [makeRun('success', 60, 1), makeRun('failure', 60, 5), makeRun('failure', 60, 10)];
    const result = detectBottlenecks(runs, {}, {});
    expect(result.find(b => b.type === 'consecutive_failures')).toBeUndefined();
  });
});

describe('bottleneck — CI: duration spike', () => {
  test('flags latest run >2x average as MEDIUM', () => {
    // latest: 600s, previous avg: 60s → 10x spike
    const runs = [makeRun('success', 600, 1), makeRun('success', 60, 5), makeRun('success', 60, 10)];
    const result = detectBottlenecks(runs, {}, {});
    const found = result.find(b => b.type === 'duration_spike');
    expect(found).toBeDefined();
    expect(found.severity).toBe('medium');
  });

  test('does NOT flag when latest run is under 120s even if proportionally slow', () => {
    const runs = [makeRun('success', 100, 1), makeRun('success', 10, 5), makeRun('success', 10, 10)];
    const result = detectBottlenecks(runs, {}, {});
    expect(result.find(b => b.type === 'duration_spike')).toBeUndefined();
  });
});

describe('bottleneck — CI: stuck pipeline', () => {
  test('flags a run in progress for over 1 hour', () => {
    const stuckRun = {
      ...makeRun('running', 0, 0, 'stuck-repo'),
      startedAt: new Date(Date.now() - 90 * 60 * 1000).toISOString(), // 90 min ago
    };
    const result = detectBottlenecks([stuckRun], {}, {});
    expect(result.find(b => b.type === 'stuck_pipeline')).toBeDefined();
  });

  test('does NOT flag a recently started running pipeline', () => {
    const runs = [makeRun('running', 0, 5)];
    const result = detectBottlenecks(runs, {}, {});
    expect(result.find(b => b.type === 'stuck_pipeline')).toBeUndefined();
  });
});

// ─── Jira Rules ──────────────────────────────────────────────────────────────

describe('bottleneck — Jira: bug cluster', () => {
  test('flags component with ≥5 bugs as HIGH', () => {
    const jira = { bugsByComponent: { 'Auth Module': 6 }, byStatus: {}, criticalBugs: 0 };
    const result = detectBottlenecks([], jira, {});
    const found = result.find(b => b.type === 'bug_concentration');
    expect(found).toBeDefined();
    expect(found.severity).toBe('high');
  });

  test('flags component with ≥10 bugs as CRITICAL', () => {
    const jira = { bugsByComponent: { 'Payments': 12 }, byStatus: {}, criticalBugs: 0 };
    const result = detectBottlenecks([], jira, {});
    expect(result.find(b => b.type === 'bug_concentration')?.severity).toBe('critical');
  });

  test('does NOT flag component with <5 bugs', () => {
    const jira = { bugsByComponent: { 'UI': 3 }, byStatus: {}, criticalBugs: 0 };
    const result = detectBottlenecks([], jira, {});
    expect(result.find(b => b.type === 'bug_concentration')).toBeUndefined();
  });
});

describe('bottleneck — Jira: critical bugs', () => {
  test('flags ≥3 critical bugs as HIGH', () => {
    const jira = { bugsByComponent: {}, byStatus: {}, criticalBugs: 4 };
    const result = detectBottlenecks([], jira, {});
    expect(result.find(b => b.type === 'critical_bugs')).toBeDefined();
  });

  test('flags ≥8 critical bugs as CRITICAL', () => {
    const jira = { bugsByComponent: {}, byStatus: {}, criticalBugs: 9 };
    const result = detectBottlenecks([], jira, {});
    expect(result.find(b => b.type === 'critical_bugs')?.severity).toBe('critical');
  });
});

describe('bottleneck — Jira: WIP pile-up', () => {
  test('flags >50% In Progress with >10 total as MEDIUM', () => {
    const jira = { bugsByComponent: {}, byStatus: { 'In Progress': 12, 'Done': 8 }, criticalBugs: 0 };
    const result = detectBottlenecks([], jira, {});
    expect(result.find(b => b.type === 'wip_pileup')).toBeDefined();
  });

  test('does NOT flag when In Progress count is ≤10 even if >50%', () => {
    const jira = { bugsByComponent: {}, byStatus: { 'In Progress': 6, 'Done': 4 }, criticalBugs: 0 };
    const result = detectBottlenecks([], jira, {});
    expect(result.find(b => b.type === 'wip_pileup')).toBeUndefined();
  });
});

// ─── Test Data Rules ──────────────────────────────────────────────────────────

describe('bottleneck — Tests: low pass rate', () => {
  test('flags overall pass rate <70% as HIGH', () => {
    const testData = {
      testCycles: [{ key: 'TC-1', name: 'Cycle 1', totalCount: 10, failCount: 4, passRate: 60 }],
      summary: { overallPassRate: 60 },
    };
    const result = detectBottlenecks([], {}, testData);
    expect(result.find(b => b.type === 'test_failure_rate')).toBeDefined();
  });

  test('flags pass rate <50% as CRITICAL', () => {
    const testData = {
      testCycles: [{ key: 'TC-1', name: 'Cycle 1', totalCount: 10, failCount: 6 }],
      summary: { overallPassRate: 40 },
    };
    const result = detectBottlenecks([], {}, testData);
    expect(result.find(b => b.type === 'test_failure_rate')?.severity).toBe('critical');
  });

  test('does NOT flag when pass rate ≥70%', () => {
    const testData = {
      testCycles: [{ key: 'TC-1', name: 'Cycle 1', totalCount: 10, failCount: 2 }],
      summary: { overallPassRate: 80 },
    };
    const result = detectBottlenecks([], {}, testData);
    expect(result.find(b => b.type === 'test_failure_rate')).toBeUndefined();
  });
});

// ─── Severity ordering ────────────────────────────────────────────────────────

describe('bottleneck — output ordering', () => {
  test('critical bottlenecks appear before high and medium', () => {
    const runs = [
      makeRun('failure', 60, 1), makeRun('failure', 60, 5), makeRun('failure', 60, 10), // consecutive → critical
    ];
    const jira = { bugsByComponent: { 'X': 6 }, byStatus: {}, criticalBugs: 0 }; // bug cluster → high
    const result = detectBottlenecks(runs, jira, {});
    const severities = result.map(b => b.severity);
    const critIdx = severities.indexOf('critical');
    const highIdx = severities.indexOf('high');
    if (critIdx !== -1 && highIdx !== -1) {
      expect(critIdx).toBeLessThan(highIdx);
    }
  });

  test('deduplicates bottlenecks with the same id', () => {
    const runs = [makeRun('failure', 60, 1), makeRun('failure', 60, 2), makeRun('failure', 60, 3)];
    const result = detectBottlenecks(runs, {}, {});
    const ids = result.map(b => b.id);
    expect(ids.length).toBe(new Set(ids).size);
  });
});
