const axios  = require('axios');
const AdmZip = require('adm-zip');
const config = require('../config');
const cache  = require('../services/cache');

const gh = axios.create({
  baseURL: config.github.baseUrl,
  timeout: 20000,
  headers: {
    Accept: 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
    ...(config.github.token ? { Authorization: `Bearer ${config.github.token}` } : {}),
  },
});

const CACHE_TTL = 570;

function durationSec(start, end) {
  if (!start || !end) return 0;
  return Math.round((new Date(end) - new Date(start)) / 1000);
}

function mapStatus(status, conclusion) {
  if (status === 'in_progress') return 'running';
  if (status === 'queued')      return 'queued';
  switch (conclusion) {
    case 'success':   return 'success';
    case 'failure':   return 'failure';
    case 'cancelled': return 'cancelled';
    case 'skipped':   return 'skipped';
    case 'timed_out': return 'failure';
    default:          return conclusion || 'unknown';
  }
}

// ─── Per-repo data fetchers ───────────────────────────────────────────────────

async function fetchRuns(owner, repo) {
  const cacheKey = `sh:runs:${owner}/${repo}`;
  const cached   = cache.get(cacheKey);
  if (cached) return cached;

  try {
    const { data } = await gh.get(`/repos/${owner}/${repo}/actions/runs`, { params: { per_page: 100 } });
    const runs = (data.workflow_runs || []).map(run => ({
      id:           run.id,
      runNumber:    run.run_number,
      name:         run.name,
      displayTitle: run.display_title,
      branch:       run.head_branch,
      commitSha:    run.head_sha?.slice(0, 7),
      commitMsg:    run.head_commit?.message?.split('\n')[0] || '',
      actor:        run.actor?.login || 'unknown',
      event:        run.event,
      status:       mapStatus(run.status, run.conclusion),
      rawStatus:    run.status,
      rawConclusion: run.conclusion,
      startedAt:    run.created_at,
      updatedAt:    run.updated_at,
      durationSec:  durationSec(run.created_at, run.updated_at),
      url:          run.html_url,
      workflowId:   run.workflow_id,
    }));
    cache.set(cacheKey, runs, CACHE_TTL);
    return runs;
  } catch (err) {
    console.error(`[SelfHealing] Error fetching runs for ${owner}/${repo}:`, err.message);
    return cache.get(cacheKey) || [];
  }
}

async function fetchWorkflows(owner, repo) {
  const cacheKey = `sh:workflows:${owner}/${repo}`;
  const cached   = cache.get(cacheKey);
  if (cached) return cached;

  try {
    const { data } = await gh.get(`/repos/${owner}/${repo}/actions/workflows`);
    const workflows = (data.workflows || []).map(w => ({ id: w.id, name: w.name, state: w.state, url: w.html_url }));
    cache.set(cacheKey, workflows, 3600);
    return workflows;
  } catch (err) {
    console.error(`[SelfHealing] Error fetching workflows for ${owner}/${repo}:`, err.message);
    return cache.get(cacheKey) || [];
  }
}

// Fetches the ci-summary.json from the latest completed run's artifact
async function fetchCiSummary(owner, repo) {
  const cacheKey = `sh:cisummary:${owner}/${repo}`;
  const cached   = cache.get(cacheKey);
  if (cached) return cached;

  if (!config.github.token) {
    console.warn(`[SelfHealing] No GITHUB_TOKEN — skipping artifact fetch for ${owner}/${repo}`);
    return null;
  }

  try {
    // Find latest completed run from the report/aggregate workflow job
    const { data: runsData } = await gh.get(`/repos/${owner}/${repo}/actions/runs`, {
      params: { per_page: 20, status: 'completed' },
    });
    if (!runsData.workflow_runs?.length) return null;

    // Try each recent run until we find one with a ci-summary artifact
    for (const run of runsData.workflow_runs.slice(0, 5)) {
      try {
        const { data: artData } = await gh.get(`/repos/${owner}/${repo}/actions/runs/${run.id}/artifacts`);
        const summaryArt = (artData.artifacts || []).find(a => a.name.startsWith('ci-summary'));
        if (!summaryArt) continue;

        // Download the zip (GitHub redirects to S3, follow redirects)
        const zipRes = await axios.get(summaryArt.archive_download_url, {
          responseType: 'arraybuffer',
          maxRedirects: 5,
          headers: {
            Authorization: `Bearer ${config.github.token}`,
            Accept: 'application/vnd.github+json',
          },
          timeout: 15000,
        });

        const zip     = new AdmZip(Buffer.from(zipRes.data));
        const entry   = zip.getEntries().find(e => e.entryName === 'ci-summary.json');
        if (!entry) continue;

        const summary = JSON.parse(entry.getData().toString('utf8'));
        const result  = {
          totalRuns:     summary.totalRuns     ?? 0,
          selectorHeals: summary.selectorHeals ?? 0,
          flowHeals:     summary.flowHeals     ?? 0,
          failures:      summary.failures      ?? 0,
          timeSavedHours: parseFloat(summary.timeSavedHours ?? 0),
          healRate:      parseFloat(summary.healRate ?? 0),
          runNumber:     run.run_number,
          runUrl:        run.html_url,
          runAt:         run.created_at,
        };
        cache.set(cacheKey, result, CACHE_TTL);
        return result;
      } catch (_) { continue; }
    }
    return null;
  } catch (err) {
    console.error(`[SelfHealing] ci-summary fetch failed for ${owner}/${repo}:`, err.message);
    return cache.get(cacheKey) || null;
  }
}

// ─── Derived stats ────────────────────────────────────────────────────────────

function buildHeatmap(runs) {
  const days = {};
  const now  = Date.now();
  for (let i = 0; i < 90; i++) {
    const key = new Date(now - i * 86400000).toISOString().slice(0, 10);
    days[key] = { date: key, total: 0, success: 0, failure: 0, running: 0 };
  }
  for (const run of runs) {
    const day = run.startedAt?.slice(0, 10);
    if (!day || !days[day]) continue;
    days[day].total++;
    if (run.status === 'success')      days[day].success++;
    else if (run.status === 'failure') days[day].failure++;
    else if (run.status === 'running') days[day].running++;
  }
  return Object.values(days).sort((a, b) => a.date.localeCompare(b.date));
}

function buildWorkflowStats(runs) {
  const stats = {};
  for (const run of runs) {
    const name = run.name;
    if (!stats[name]) stats[name] = { name, total: 0, success: 0, failure: 0, running: 0, durations: [] };
    stats[name].total++;
    if (run.status === 'success')      stats[name].success++;
    else if (run.status === 'failure') stats[name].failure++;
    else if (run.status === 'running') stats[name].running++;
    if (run.durationSec > 0)           stats[name].durations.push(run.durationSec);
  }
  return Object.values(stats).map(s => ({
    ...s,
    passRate:    s.total ? Math.round((s.success / s.total) * 100) : 0,
    avgDuration: s.durations.length ? Math.round(s.durations.reduce((a, b) => a + b, 0) / s.durations.length) : 0,
  }));
}

function buildSummary(runs) {
  const now    = Date.now();
  const last30 = runs.filter(r => now - new Date(r.startedAt) < 30 * 86400000);
  const done   = last30.filter(r => r.status === 'success' || r.status === 'failure');
  const passed = done.filter(r => r.status === 'success');

  let streak = 0;
  for (const run of runs) {
    if (run.status === 'running' || run.status === 'queued') continue;
    if (run.status === 'success') streak++;
    else break;
  }

  const durations  = done.filter(r => r.durationSec > 0).map(r => r.durationSec);
  const avgDuration = durations.length ? Math.round(durations.reduce((a, b) => a + b, 0) / durations.length) : 0;

  return {
    totalRuns:   last30.length,
    passRate:    done.length ? Math.round((passed.length / done.length) * 100) : 0,
    passCount:   passed.length,
    failCount:   done.length - passed.length,
    avgDuration,
    streak,
    lastRun:     runs[0] || null,
  };
}

// ─── Dashboard-data branch fetcher ───────────────────────────────────────────

async function fetchDashboardBranchData(owner, repo) {
  const cacheKey = `sh:dashboard:${owner}/${repo}`;
  const cached   = cache.get(cacheKey);
  if (cached) return cached;

  try {
    const base = `https://raw.githubusercontent.com/${owner}/${repo}/dashboard-data`;
    const [latestRes, historyRes] = await Promise.all([
      axios.get(`${base}/latest.json`, { timeout: 10000 }),
      axios.get(`${base}/history.json`, { timeout: 10000 }),
    ]);
    const raw = latestRes.data;
    // Normalize flat format (Gautam-style) into nested stats/workflow format (Riya-style)
    const latest = raw.stats ? raw : {
      generatedAt: raw.generatedAt,
      runs: raw.runs || [],
      stats: {
        totalTestsCompleted: raw.totalTestsCompleted,
        totalSelectorHeals:  raw.totalSelectorHeals,
        totalFlowHeals:      raw.totalFlowHeals,
        totalFailures:       raw.totalFailures,
        estimatedTimeSaved:  raw.estimatedTimeSaved,
        healSuccessRate:     raw.healSuccessRate,
      },
      workflow: {
        runId:        raw.runId,
        runNumber:    raw.runNumber,
        workflowName: raw.workflowName,
        repository:   raw.repository,
        branch:       raw.branch,
        commitSha:    raw.commitSha,
        event:        raw.event,
      },
    };
    const result = { latest, history: historyRes.data };
    cache.set(cacheKey, result, 55);   // just under poll interval so each cycle gets fresh data
    return result;
  } catch (err) {
    console.error(`[SelfHealing] dashboard-data fetch failed for ${owner}/${repo}:`, err.message);
    return cache.get(cacheKey) || null;
  }
}

// ─── Per-repo aggregation ─────────────────────────────────────────────────────

async function fetchRepoData({ owner, repo, label, hasCiSummary, hasDashboardData }) {
  const [runs, workflows, ciSummary, dashboardData] = await Promise.all([
    fetchRuns(owner, repo),
    fetchWorkflows(owner, repo),
    hasCiSummary     ? fetchCiSummary(owner, repo)         : Promise.resolve(null),
    hasDashboardData ? fetchDashboardBranchData(owner, repo) : Promise.resolve(null),
  ]);

  return {
    owner, repo, label,
    runs,
    workflows,
    ciSummary,
    dashboardData,
    heatmap:   buildHeatmap(runs),
    wfStats:   buildWorkflowStats(runs),
    summary:   buildSummary(runs),
    repoUrl:   `https://github.com/${owner}/${repo}`,
    actionsUrl: `https://github.com/${owner}/${repo}/actions`,
  };
}

// ─── Main export ──────────────────────────────────────────────────────────────

async function fetchSelfHealingData() {
  const results = await Promise.allSettled(
    config.selfHealing.repos.map(r => fetchRepoData(r))
  );

  const repos = results
    .filter(r => r.status === 'fulfilled')
    .map(r => r.value);

  return {
    repos,
    fetchedAt: new Date().toISOString(),
  };
}

module.exports = { fetchSelfHealingData };
