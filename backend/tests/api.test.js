/**
 * API endpoint tests using supertest.
 * The poller is mocked so no real GitHub/Jira calls are made.
 */
process.env.GITHUB_TOKEN = 'test-token';
process.env.JIRA_BASE_URL = 'https://issues.apache.org/jira';

// Mock the poller before requiring the app so it never starts real polling
jest.mock('../services/poller', () => ({
  start: jest.fn(),
  getState: jest.fn(() => ({
    ciRuns: [
      { id: '1', repoLabel: 'facebook/react', status: 'success', branch: 'main', durationSec: 120, startedAt: new Date().toISOString() },
      { id: '2', repoLabel: 'facebook/react', status: 'failure', branch: 'main', durationSec: 90,  startedAt: new Date().toISOString() },
    ],
    jiraData: {
      allIssues: [
        { key: 'KAFKA-1', fields: { summary: 'Test issue', issuetype: { name: 'Bug' }, status: { name: 'Open' }, priority: { name: 'High' } } },
        { key: 'HADOOP-2', fields: { summary: 'Another issue', issuetype: { name: 'Task' }, status: { name: 'In Progress' }, priority: { name: 'Low' } } },
      ],
      metrics: { total: 2, byStatus: { Open: 1, 'In Progress': 1 }, criticalBugs: 0, bugsByComponent: {} },
      projects: [{ key: 'KAFKA', name: 'Kafka' }],
      fetchedAt: new Date().toISOString(),
    },
    testData: {
      testCycles: [{ key: 'TC-1', name: 'Smoke', totalCount: 10, failCount: 1, passRate: 90 }],
      testExecutions: [{ id: 'e1', testCycleKey: 'TC-1', status: 'Pass' }],
      summary: { totalExecutions: 10, overallPassRate: 90 },
      fetchedAt: new Date().toISOString(),
    },
    bottlenecks: [
      { id: 'b1', severity: 'high', title: 'Test bottleneck', type: 'ci_failure_rate', module: 'react', detectedAt: new Date().toISOString() },
    ],
    selfHealing: { repos: [] },
    lastPollAt: { ci: new Date().toISOString(), jira: new Date().toISOString() },
  })),
  pollSelfHealingNow: jest.fn(),
}));

const request = require('supertest');
const express = require('express');
const cors    = require('cors');
const compression = require('compression');
const apiRouter   = require('../routes/api');

// Build a minimal test app (no WebSocket, no poller.start)
const app = express();
app.use(compression());
app.use(cors());
app.use(express.json());
app.use('/api', apiRouter);

// ─── /api/status ─────────────────────────────────────────────────────────────

describe('GET /api/status', () => {
  test('returns 200 with ok:true', async () => {
    const res = await request(app).get('/api/status');
    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
  });

  test('includes version field', async () => {
    const res = await request(app).get('/api/status');
    expect(res.body.version).toBeDefined();
  });

  test('includes counts object', async () => {
    const res = await request(app).get('/api/status');
    expect(res.body.counts).toBeDefined();
    expect(typeof res.body.counts.ciRuns).toBe('number');
    expect(typeof res.body.counts.bottlenecks).toBe('number');
  });
});

// ─── /api/ci/runs ─────────────────────────────────────────────────────────────

describe('GET /api/ci/runs', () => {
  test('returns 200 with runs array', async () => {
    const res = await request(app).get('/api/ci/runs');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.runs)).toBe(true);
  });

  test('filters by status=success', async () => {
    const res = await request(app).get('/api/ci/runs?status=success');
    expect(res.status).toBe(200);
    res.body.runs.forEach(r => expect(r.status).toBe('success'));
  });

  test('filters by repoLabel', async () => {
    const res = await request(app).get('/api/ci/runs?repoLabel=facebook%2Freact');
    expect(res.status).toBe(200);
    res.body.runs.forEach(r => expect(r.repoLabel).toBe('facebook/react'));
  });

  test('respects limit query param', async () => {
    const res = await request(app).get('/api/ci/runs?limit=1');
    expect(res.body.runs.length).toBeLessThanOrEqual(1);
  });
});

// ─── /api/ci/heatmap ──────────────────────────────────────────────────────────

describe('GET /api/ci/heatmap', () => {
  test('returns 200 with grid array', async () => {
    const res = await request(app).get('/api/ci/heatmap');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.grid)).toBe(true);
  });

  test('each grid item has module, slots, passRate, trend', async () => {
    const res = await request(app).get('/api/ci/heatmap');
    const item = res.body.grid[0];
    expect(item).toHaveProperty('module');
    expect(item).toHaveProperty('slots');
    expect(item).toHaveProperty('passRate');
    expect(item).toHaveProperty('trend');
  });

  test('passRate is between 0 and 100', async () => {
    const res = await request(app).get('/api/ci/heatmap');
    res.body.grid.forEach(item => {
      expect(item.passRate).toBeGreaterThanOrEqual(0);
      expect(item.passRate).toBeLessThanOrEqual(100);
    });
  });
});

// ─── /api/jira/issues ─────────────────────────────────────────────────────────

describe('GET /api/jira/issues', () => {
  test('returns 200 with issues array', async () => {
    const res = await request(app).get('/api/jira/issues');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.issues)).toBe(true);
  });

  test('filters by projectKey (KAFKA)', async () => {
    const res = await request(app).get('/api/jira/issues?projectKey=KAFKA');
    expect(res.status).toBe(200);
    res.body.issues.forEach(i => expect(i.key.startsWith('KAFKA-')).toBe(true));
  });

  test('projectKey filter does NOT include partial matches (e.g. KAFKA2)', async () => {
    // KAFKA2-1 should NOT appear when filtering by KAFKA
    const res = await request(app).get('/api/jira/issues?projectKey=KAFKA');
    res.body.issues.forEach(i => expect(i.key).toMatch(/^KAFKA-/));
  });

  test('includes metrics in response', async () => {
    const res = await request(app).get('/api/jira/issues');
    expect(res.body.metrics).toBeDefined();
    expect(typeof res.body.metrics.total).toBe('number');
  });
});

// ─── /api/tests/cycles ────────────────────────────────────────────────────────

describe('GET /api/tests/cycles', () => {
  test('returns 200 with testCycles array', async () => {
    const res = await request(app).get('/api/tests/cycles');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.testCycles)).toBe(true);
  });

  test('includes summary', async () => {
    const res = await request(app).get('/api/tests/cycles');
    expect(res.body.summary).toBeDefined();
  });
});

// ─── /api/tests/executions ────────────────────────────────────────────────────

describe('GET /api/tests/executions', () => {
  test('returns 200 with testExecutions array', async () => {
    const res = await request(app).get('/api/tests/executions');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.testExecutions)).toBe(true);
  });

  test('filters by cycleKey', async () => {
    const res = await request(app).get('/api/tests/executions?cycleKey=TC-1');
    res.body.testExecutions.forEach(e => expect(e.testCycleKey).toBe('TC-1'));
  });
});

// ─── /api/bottlenecks ─────────────────────────────────────────────────────────

describe('GET /api/bottlenecks', () => {
  test('returns 200 with bottlenecks array', async () => {
    const res = await request(app).get('/api/bottlenecks');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.bottlenecks)).toBe(true);
  });

  test('each bottleneck has id, severity, title', async () => {
    const res = await request(app).get('/api/bottlenecks');
    res.body.bottlenecks.forEach(b => {
      expect(b).toHaveProperty('id');
      expect(b).toHaveProperty('severity');
      expect(b).toHaveProperty('title');
    });
  });
});

// ─── /api/refresh ─────────────────────────────────────────────────────────────

describe('POST /api/refresh', () => {
  test('returns 200 with ok:true', async () => {
    const res = await request(app).post('/api/refresh');
    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
  });
});
