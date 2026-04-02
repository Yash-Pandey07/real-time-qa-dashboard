const express = require('express');
const router  = express.Router();
const poller  = require('../services/poller');
const cache   = require('../services/cache');

router.get('/status', (req, res) => {
  const state = poller.getState();
  res.json({ ok: true, version: '1.0.0', lastPollAt: state.lastPollAt, counts: { ciRuns: state.ciRuns.length, jiraIssues: state.jiraData?.metrics?.total ?? 0, testCycles: state.testData?.testCycles?.length ?? 0, bottlenecks: state.bottlenecks?.length ?? 0 } });
});

router.get('/ci/runs', (req, res) => {
  const { repoLabel, status, limit = 100 } = req.query;
  let runs = poller.getState().ciRuns;
  if (repoLabel) runs = runs.filter(r => r.repoLabel === repoLabel);
  if (status)    runs = runs.filter(r => r.status    === status);
  res.json({ runs: runs.slice(0, Number(limit)), total: runs.length, fetchedAt: poller.getState().lastPollAt.ci });
});

router.get('/ci/heatmap', (req, res) => {
  const runs    = poller.getState().ciRuns;
  const modules = [...new Set(runs.map(r => r.repoLabel || 'Unknown'))];
  const grid = modules.map(module => {
    const moduleRuns = runs.filter(r => r.repoLabel === module).slice(0, 12);
    return {
      module, slots: moduleRuns.map(r => ({ runId: r.id, runNumber: r.runNumber, status: r.status, branch: r.branch, commitSha: r.commitSha, startedAt: r.startedAt, durationSec: r.durationSec, url: r.url })),
      total: moduleRuns.length, pass: moduleRuns.filter(r => r.status === 'success').length, fail: moduleRuns.filter(r => r.status === 'failure').length,
      passRate: moduleRuns.length ? Math.round(moduleRuns.filter(r => r.status === 'success').length / moduleRuns.length * 100) : 0,
    };
  });
  res.json({ grid, fetchedAt: poller.getState().lastPollAt.ci });
});

router.get('/jira/issues', (req, res) => {
  const { projectKey, type, status, priority, limit = 50 } = req.query;
  const { allIssues, metrics, fetchedAt } = poller.getState().jiraData;
  let issues = allIssues || [];
  if (projectKey) issues = issues.filter(i => i.key?.startsWith(projectKey));
  if (type)       issues = issues.filter(i => i.fields?.issuetype?.name === type);
  if (status)     issues = issues.filter(i => i.fields?.status?.name    === status);
  if (priority)   issues = issues.filter(i => i.fields?.priority?.name  === priority);
  res.json({ issues: issues.slice(0, Number(limit)), total: issues.length, metrics, fetchedAt });
});

router.get('/jira/projects', (req, res) => {
  const { projects, fetchedAt } = poller.getState().jiraData;
  res.json({ projects: projects || [], fetchedAt });
});

router.get('/tests/cycles', (req, res) => {
  const { testCycles, summary, fetchedAt } = poller.getState().testData;
  res.json({ testCycles: testCycles || [], summary, fetchedAt });
});

router.get('/tests/executions', (req, res) => {
  const { testExecutions, fetchedAt } = poller.getState().testData;
  const { cycleKey, status, limit = 100 } = req.query;
  let execs = testExecutions || [];
  if (cycleKey) execs = execs.filter(e => e.testCycleKey === cycleKey);
  if (status)   execs = execs.filter(e => e.status       === status);
  res.json({ testExecutions: execs.slice(0, Number(limit)), total: execs.length, fetchedAt });
});

router.get('/bottlenecks', (req, res) => {
  const { bottlenecks, lastPollAt } = poller.getState();
  res.json({ bottlenecks: bottlenecks || [], detectedAt: lastPollAt?.ci });
});

router.post('/refresh', (req, res) => {
  cache.flush();
  res.json({ ok: true, message: 'Cache flushed.' });
});

module.exports = router;
