const LOOKBACK_HOURS = 24;
function lookbackCutoff() { return new Date(Date.now() - LOOKBACK_HOURS * 60 * 60 * 1000); }

function analyseCiRuns(runs = []) {
  const bottlenecks = [];
  const cutoff = lookbackCutoff();
  const recent = runs.filter(r => r.startedAt && new Date(r.startedAt) >= cutoff);
  const byModule = groupBy(recent, r => r.repoLabel || r.module || 'Unknown');

  for (const [module, moduleRuns] of Object.entries(byModule)) {
    const total    = moduleRuns.length;
    const failed   = moduleRuns.filter(r => r.status === 'failure').length;
    const running  = moduleRuns.filter(r => r.status === 'running').length;
    const failRate = total ? failed / total : 0;

    if (total >= 3 && failRate >= 0.5) {
      bottlenecks.push({
        id: `ci-failure-rate-${slugify(module)}`, type: 'ci_failure_rate',
        severity: failRate >= 0.8 ? 'critical' : 'high', module,
        title: `High CI failure rate — ${module}`,
        description: `${failed} of ${total} pipeline runs failed in the last ${LOOKBACK_HOURS}h (${pct(failRate)}).`,
        recommendation: 'Check the most recent failed run logs. Common causes: flaky tests, dependency version drift, or a bad merge.',
        metric: `${pct(failRate)} failure rate (${failed}/${total})`,
        detectedAt: new Date().toISOString(),
      });
    }

    const sorted = [...moduleRuns].sort((a, b) => new Date(b.startedAt) - new Date(a.startedAt));
    let consecFails = 0;
    for (const run of sorted) { if (run.status === 'failure') consecFails++; else break; }
    if (consecFails >= 3) {
      bottlenecks.push({
        id: `ci-consecutive-${slugify(module)}`, type: 'consecutive_failures',
        severity: 'critical', module,
        title: `${consecFails} consecutive failures — ${module}`,
        description: `Every pipeline run since the last success has failed.`,
        recommendation: 'Revert the last merged PR or apply a hotfix.',
        metric: `${consecFails} consecutive failures`,
        detectedAt: new Date().toISOString(),
      });
    }

    const completed = moduleRuns.filter(r => r.durationSec > 0);
    if (completed.length >= 3) {
      const latest  = completed[0].durationSec;
      const avgPrev = avg(completed.slice(1).map(r => r.durationSec));
      if (avgPrev > 0 && latest > avgPrev * 2 && latest > 120) {
        bottlenecks.push({
          id: `ci-slowdown-${slugify(module)}`, type: 'duration_spike',
          severity: 'medium', module,
          title: `Pipeline slowdown detected — ${module}`,
          description: `Latest run took ${fmtMin(latest)} vs. average ${fmtMin(avgPrev)}.`,
          recommendation: 'Compare build steps. Look for newly added integration tests or large assets.',
          metric: `${fmtMin(latest)} (avg ${fmtMin(avgPrev)})`,
          detectedAt: new Date().toISOString(),
        });
      }
    }

    if (running > 0) {
      const stuckRuns = moduleRuns.filter(r => r.status === 'running' && r.startedAt)
        .filter(r => (Date.now() - new Date(r.startedAt)) > 60 * 60 * 1000);
      if (stuckRuns.length > 0) {
        bottlenecks.push({
          id: `ci-stuck-${slugify(module)}`, type: 'stuck_pipeline',
          severity: 'high', module,
          title: `Stuck pipeline — ${module}`,
          description: `${stuckRuns.length} pipeline(s) running for over 1 hour.`,
          recommendation: 'Check for hung test containers or missing secrets in the runner.',
          metric: `${stuckRuns.length} run(s) >1h`,
          detectedAt: new Date().toISOString(),
        });
      }
    }
  }
  return bottlenecks;
}

function analyseJiraData(jiraMetrics = {}) {
  const bottlenecks = [];
  const { bugsByComponent = {}, byStatus = {}, criticalBugs = 0 } = jiraMetrics;

  for (const [component, count] of Object.entries(bugsByComponent)) {
    if (count >= 5) {
      bottlenecks.push({
        id: `jira-bug-cluster-${slugify(component)}`, type: 'bug_concentration',
        severity: count >= 10 ? 'critical' : 'high', module: component,
        title: `Bug cluster in ${component}`,
        description: `${count} open bugs concentrated in ${component}. Suggests systemic quality issues.`,
        recommendation: 'Schedule a bug-bash session or assign a QA engineer to audit this component.',
        metric: `${count} open bugs`,
        detectedAt: new Date().toISOString(),
      });
    }
  }

  if (criticalBugs >= 3) {
    bottlenecks.push({
      id: 'jira-critical-bugs', type: 'critical_bugs',
      severity: criticalBugs >= 8 ? 'critical' : 'high', module: 'QA',
      title: `${criticalBugs} critical/blocker bugs open`,
      description: `${criticalBugs} bugs rated Critical or Blocker are unresolved.`,
      recommendation: 'Ensure each critical bug has an owner and ETA. Consider a release freeze.',
      metric: `${criticalBugs} critical bugs`,
      detectedAt: new Date().toISOString(),
    });
  }

  const inProgress = byStatus['In Progress'] || 0;
  const total = Object.values(byStatus).reduce((s, v) => s + v, 0);
  if (total > 0 && inProgress / total > 0.5 && inProgress > 10) {
    bottlenecks.push({
      id: 'jira-wip-pileup', type: 'wip_pileup',
      severity: 'medium', module: 'Process',
      title: `WIP pile-up — ${inProgress} tickets In Progress`,
      description: `Over 50% of tracked issues are simultaneously In Progress.`,
      recommendation: 'Apply a WIP limit. Prioritise finishing over starting.',
      metric: `${inProgress} In Progress (${pct(inProgress / total)} of total)`,
      detectedAt: new Date().toISOString(),
    });
  }
  return bottlenecks;
}

function analyseTestData(testData = {}) {
  const bottlenecks = [];
  const cycles      = testData.testCycles || [];
  if (!cycles.length) return bottlenecks;

  const { overallPassRate = 100 } = testData.summary || {};
  if (overallPassRate < 70) {
    bottlenecks.push({
      id: 'test-low-passrate', type: 'test_failure_rate',
      severity: overallPassRate < 50 ? 'critical' : 'high', module: 'Testing',
      title: `Low overall test pass rate — ${overallPassRate}%`,
      description: `Only ${overallPassRate}% of test cases are passing across all active test cycles.`,
      recommendation: 'Identify and quarantine flaky tests. Review recent code changes.',
      metric: `${overallPassRate}% pass rate`,
      detectedAt: new Date().toISOString(),
    });
  }

  cycles.forEach(cycle => {
    const cycleFailRate = cycle.totalCount ? cycle.failCount / cycle.totalCount : 0;
    if (cycle.totalCount >= 5 && cycleFailRate >= 0.4) {
      bottlenecks.push({
        id: `test-cycle-fail-${slugify(cycle.key)}`, type: 'test_cycle_failure',
        severity: cycleFailRate >= 0.7 ? 'critical' : 'high', module: cycle.repoLabel || 'Testing',
        title: `Test cycle failing — ${cycle.name}`,
        description: `${cycle.failCount} of ${cycle.totalCount} tests failed (${pct(cycleFailRate)}) in this cycle.`,
        recommendation: 'Review failed test cases. Check environment issues or API contract changes.',
        metric: `${cycle.failCount}/${cycle.totalCount} failed`,
        detectedAt: new Date().toISOString(),
      });
    }
  });
  return bottlenecks;
}

function detectBottlenecks(ciRuns, jiraMetrics, testData) {
  const all = [...analyseCiRuns(ciRuns), ...analyseJiraData(jiraMetrics), ...analyseTestData(testData)];
  const seen = new Set();
  const deduped = all.filter(b => { if (seen.has(b.id)) return false; seen.add(b.id); return true; });
  const order = { critical: 0, high: 1, medium: 2, low: 3 };
  return deduped.sort((a, b) => (order[a.severity] ?? 4) - (order[b.severity] ?? 4));
}

function groupBy(arr, keyFn) { return arr.reduce((acc, item) => { const k = keyFn(item); if (!acc[k]) acc[k] = []; acc[k].push(item); return acc; }, {}); }
function avg(nums) { return nums.length ? nums.reduce((a, b) => a + b, 0) / nums.length : 0; }
function pct(ratio) { return `${Math.round(ratio * 100)}%`; }
function fmtMin(sec) { return sec < 60 ? `${sec}s` : `${Math.round(sec / 60)}m`; }
function slugify(str) { return str.toLowerCase().replace(/[^a-z0-9]+/g, '-'); }

module.exports = { detectBottlenecks };
