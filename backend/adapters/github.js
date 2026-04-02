const axios  = require('axios');
const config = require('../config');
const cache  = require('../services/cache');

const gh = axios.create({
  baseURL: config.github.baseUrl,
  timeout: 15000,
  headers: {
    Accept: 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
    ...(config.github.token ? { Authorization: `Bearer ${config.github.token}` } : {}),
  },
});

function durationSec(start, end) {
  if (!start || !end) return 0;
  return Math.round((new Date(end) - new Date(start)) / 1000);
}

function mapConclusion(status, conclusion) {
  if (status === 'in_progress') return 'running';
  if (status === 'queued')      return 'queued';
  switch (conclusion) {
    case 'success':         return 'success';
    case 'failure':         return 'failure';
    case 'cancelled':       return 'cancelled';
    case 'skipped':         return 'skipped';
    case 'timed_out':       return 'failure';
    case 'action_required': return 'pending';
    default:                return 'unknown';
  }
}

async function fetchRepoRuns({ owner, repo, label }) {
  const cacheKey = `gh:runs:${owner}/${repo}`;
  const cached   = cache.get(cacheKey);
  if (cached) return cached;
  try {
    const { data } = await gh.get(`/repos/${owner}/${repo}/actions/runs`, { params: { per_page: config.github.runsPerRepo } });
    const runs = (data.workflow_runs || []).map(run => ({
      id:           `gh-${run.id}`,
      sourceId:     run.id,
      source:       'github_actions',
      url:          run.html_url,
      repo:         `${owner}/${repo}`,
      repoLabel:    label,
      workflowId:   run.workflow_id,
      runNumber:    run.run_number,
      name:         run.name,
      displayTitle: run.display_title,
      branch:       run.head_branch,
      commitSha:    run.head_sha?.slice(0, 7),
      actor:        run.actor?.login || 'unknown',
      event:        run.event,
      rawStatus:    run.status,
      rawConclusion: run.conclusion,
      status:       mapConclusion(run.status, run.conclusion),
      startedAt:    run.created_at,
      updatedAt:    run.updated_at,
      durationSec:  durationSec(run.created_at, run.updated_at),
      module:       label,
      component:    run.name,
    }));
    cache.set(cacheKey, runs, 80);
    return runs;
  } catch (err) {
    console.error(`[GitHub] Error fetching runs for ${owner}/${repo}:`, err.message);
    return cache.get(cacheKey) || [];
  }
}

async function fetchAllRuns() {
  const results = await Promise.allSettled(config.github.repos.map(r => fetchRepoRuns(r)));
  const runs = results.filter(r => r.status === 'fulfilled').flatMap(r => r.value);
  return runs.sort((a, b) => new Date(b.startedAt) - new Date(a.startedAt));
}

function mapCheckToZephyrStatus(conclusion) {
  switch (conclusion) {
    case 'success':         return 'Pass';
    case 'failure':         return 'Fail';
    case 'cancelled':       return 'Blocked';
    case 'skipped':         return 'Not Executed';
    case 'timed_out':       return 'Fail';
    case 'action_required': return 'Blocked';
    default:                return 'In Progress';
  }
}

async function fetchRepoCheckRuns({ owner, repo, label }) {
  const cacheKey = `gh:checks:${owner}/${repo}`;
  const cached   = cache.get(cacheKey);
  if (cached) return cached;
  try {
    // Step 1: get default branch name
    const repoRes     = await gh.get(`/repos/${owner}/${repo}`);
    const defaultBranch = repoRes.data.default_branch || 'main';

    // Step 2: get check runs for the latest commit on default branch
    // GET /repos/{owner}/{repo}/commits/{ref}/check-runs is the correct listing endpoint
    const runsRes   = await gh.get(`/repos/${owner}/${repo}/commits/${defaultBranch}/check-runs`, { params: { per_page: 50 } });
    const checkRuns = runsRes.data.check_runs || [];
    if (!checkRuns.length) return null;

    const pass    = checkRuns.filter(r => r.conclusion === 'success').length;
    const fail    = checkRuns.filter(r => r.conclusion === 'failure' || r.conclusion === 'timed_out').length;
    const blocked = checkRuns.filter(r => r.conclusion === 'cancelled' || r.conclusion === 'action_required').length;
    const notExec = checkRuns.filter(r => r.conclusion === 'skipped').length;
    const running = checkRuns.filter(r => r.status === 'in_progress').length;
    const total   = checkRuns.length;

    // Synthesize a suite-level object from the aggregated check runs
    const firstRun = checkRuns[0];
    const suiteId  = firstRun.check_suite?.id || firstRun.id;
    const headSha  = firstRun.head_sha || '';
    const allDone  = running === 0;

    const testCycle = {
      key:              `${label.toUpperCase().replace(/\s+/g, '-')}-CYCLE-${suiteId}`,
      name:             `${label} — ${defaultBranch} @ ${headSha.slice(0, 7)}`,
      description:      `Auto-generated from GitHub check-runs on ${defaultBranch} in ${owner}/${repo}`,
      status:           allDone ? (fail === 0 ? 'Done' : 'In Progress') : 'In Progress',
      startDate:        firstRun.started_at?.slice(0, 10),
      endDate:          firstRun.completed_at?.slice(0, 10),
      totalCount:       total,
      passCount:        pass,
      failCount:        fail,
      blockedCount:     blocked,
      notExecutedCount: notExec,
      inProgressCount:  running,
      passRate:         total ? Math.round((pass / total) * 100) : 0,
      automated:        total,
      manual:           0,
      source:           'github_check_runs',
      repo:             `${owner}/${repo}`,
      repoLabel:        label,
      commitSha:        headSha.slice(0, 7),
      updatedAt:        firstRun.completed_at || firstRun.started_at,
    };

    const testExecutions = checkRuns.map(cr => ({
      key:          `TC-${cr.id}`,
      testCase: {
        key:        `TC-${cr.id}`,
        name:       cr.name,
        automated:  true,
        priority:   cr.conclusion === 'failure' ? 'High' : 'Medium',
        labels:     [label],
        component:  label,
      },
      testCycleKey: testCycle.key,
      status:       mapCheckToZephyrStatus(cr.conclusion),
      startedAt:    cr.started_at,
      completedAt:  cr.completed_at,
      durationSec:  durationSec(cr.started_at, cr.completed_at),
      environment:  'CI/CD',
      automated:    true,
      comment:      cr.output?.summary || '',
      url:          cr.html_url,
      app:          cr.app?.name || 'GitHub Actions',
    }));

    const result = { testCycle, testExecutions };
    cache.set(cacheKey, result, 80);
    return result;
  } catch (err) {
    console.error(`[GitHub] Error fetching check-runs for ${owner}/${repo}:`, err.message);
    return cache.get(cacheKey) || null;
  }
}

async function fetchAllTestData() {
  const results = await Promise.allSettled(config.github.repos.map(r => fetchRepoCheckRuns(r)));
  const valid   = results.filter(r => r.status === 'fulfilled' && r.value).map(r => r.value);
  const t = valid.reduce((s, v) => s + v.testCycle.totalCount, 0);
  const p = valid.reduce((s, v) => s + v.testCycle.passCount, 0);
  return {
    testCycles:     valid.map(v => v.testCycle),
    testExecutions: valid.flatMap(v => v.testExecutions),
    summary: {
      totalCycles:     valid.length,
      totalExecutions: t,
      totalPass:       p,
      totalFail:       valid.reduce((s, v) => s + v.testCycle.failCount, 0),
      overallPassRate: t ? Math.round((p / t) * 100) : 0,
    },
    fetchedAt: new Date().toISOString(),
  };
}

module.exports = { fetchAllRuns, fetchAllTestData };
