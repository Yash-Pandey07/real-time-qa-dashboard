/**
 * External API connectivity tests.
 * These tests hit real URLs to verify our data sources are reachable.
 * They are intentionally lightweight — we only check HTTP status codes,
 * not the full data shape, so they stay fast and don't consume API quota.
 *
 * Skipped automatically in CI when GITHUB_TOKEN is not a real token
 * (the dummy token used in CI would get 401 from GitHub API).
 */
const axios = require('axios');

const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const hasRealToken = GITHUB_TOKEN && GITHUB_TOKEN !== 'dummy' && GITHUB_TOKEN.length > 10;

// ─── GitHub raw CDN (no auth needed) ──────────────────────────────────────────

describe('External: GitHub raw CDN — riyabhatia45/QAi dashboard-data branch', () => {
  test('latest.json is reachable and returns valid JSON', async () => {
    const url = 'https://raw.githubusercontent.com/riyabhatia45/QAi/dashboard-data/latest.json';
    const res = await axios.get(url, { timeout: 10000 });
    expect(res.status).toBe(200);
    expect(typeof res.data).toBe('object');
  });

  test('history.json is reachable and returns valid JSON', async () => {
    const url = 'https://raw.githubusercontent.com/riyabhatia45/QAi/dashboard-data/history.json';
    const res = await axios.get(url, { timeout: 10000 });
    expect(res.status).toBe(200);
    expect(Array.isArray(res.data) || typeof res.data === 'object').toBe(true);
  });
});

// ─── GitHub API (needs token) ─────────────────────────────────────────────────

const githubTest = hasRealToken ? test : test.skip;

describe('External: GitHub API — tracked repositories', () => {
  const headers = { Authorization: `Bearer ${GITHUB_TOKEN}`, 'User-Agent': 'qa-dashboard-test' };

  githubTest('facebook/react repo is accessible', async () => {
    const res = await axios.get('https://api.github.com/repos/facebook/react', { headers, timeout: 10000 });
    expect(res.status).toBe(200);
    expect(res.data.full_name).toBe('facebook/react');
  });

  githubTest('vercel/next.js repo is accessible', async () => {
    const res = await axios.get('https://api.github.com/repos/vercel/next.js', { headers, timeout: 10000 });
    expect(res.status).toBe(200);
    expect(res.data.full_name).toBe('vercel/next.js');
  });

  githubTest('microsoft/vscode repo is accessible', async () => {
    const res = await axios.get('https://api.github.com/repos/microsoft/vscode', { headers, timeout: 10000 });
    expect(res.status).toBe(200);
    expect(res.data.full_name).toBe('microsoft/vscode');
  });

  githubTest('nodejs/node repo is accessible', async () => {
    const res = await axios.get('https://api.github.com/repos/nodejs/node', { headers, timeout: 10000 });
    expect(res.status).toBe(200);
    expect(res.data.full_name).toBe('nodejs/node');
  });

  githubTest('riyabhatia45/QAi repo is accessible', async () => {
    const res = await axios.get('https://api.github.com/repos/riyabhatia45/QAi', { headers, timeout: 10000 });
    expect(res.status).toBe(200);
    expect(res.data.full_name).toBe('riyabhatia45/QAi');
  });
});

// ─── Apache Jira (public, no auth needed) ────────────────────────────────────

describe('External: Apache Jira — public projects', () => {
  const BASE = 'https://issues.apache.org/jira/rest/api/2';

  test('KAFKA project is accessible', async () => {
    const res = await axios.get(`${BASE}/project/KAFKA`, { timeout: 10000 });
    expect(res.status).toBe(200);
    expect(res.data.key).toBe('KAFKA');
  });

  test('HADOOP project is accessible', async () => {
    const res = await axios.get(`${BASE}/project/HADOOP`, { timeout: 10000 });
    expect(res.status).toBe(200);
    expect(res.data.key).toBe('HADOOP');
  });

  test('SPARK project is accessible', async () => {
    const res = await axios.get(`${BASE}/project/SPARK`, { timeout: 10000 });
    expect(res.status).toBe(200);
    expect(res.data.key).toBe('SPARK');
  });
});
