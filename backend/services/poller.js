const config = require('../config');
const { fetchAllRuns, fetchAllTestData } = require('../adapters/github');
const { fetchAllJiraData }              = require('../adapters/jira');
const { fetchSelfHealingData }          = require('../adapters/selfhealing');
const { detectBottlenecks }             = require('./bottleneck');

const state = {
  ciRuns: [], jiraData: { projects: [], allIssues: [], metrics: {}, fetchedAt: null },
  testData: { testCycles: [], testExecutions: [], summary: {}, fetchedAt: null },
  bottlenecks: [], selfHealing: null,
  lastPollAt: { ci: null, jira: null, tests: null, selfHealing: null },
};

let broadcast = () => {};

async function pollCI() {
  try {
    const runs = await fetchAllRuns();
    state.ciRuns = runs; state.lastPollAt.ci = new Date().toISOString();
    broadcast('ci:update', { runs, fetchedAt: state.lastPollAt.ci });
    refreshBottlenecks();
    console.log(`[Poller] CI: ${runs.length} runs fetched.`);
  } catch (err) { console.error('[Poller] CI poll failed:', err.message); }
}

async function pollJira() {
  try {
    const data = await fetchAllJiraData();
    state.jiraData = data; state.lastPollAt.jira = new Date().toISOString();
    broadcast('jira:update', { ...data, fetchedAt: state.lastPollAt.jira });
    refreshBottlenecks();
    console.log(`[Poller] Jira: ${data.metrics.total} issues.`);
  } catch (err) { console.error('[Poller] Jira poll failed:', err.message); }
}

async function pollTests() {
  try {
    const data = await fetchAllTestData();
    state.testData = data; state.lastPollAt.tests = new Date().toISOString();
    broadcast('tests:update', { ...data, fetchedAt: state.lastPollAt.tests });
    refreshBottlenecks();
    console.log(`[Poller] Tests: ${data.testCycles.length} cycles.`);
  } catch (err) { console.error('[Poller] Test poll failed:', err.message); }
}

function refreshBottlenecks() {
  state.bottlenecks = detectBottlenecks(state.ciRuns, state.jiraData.metrics, state.testData);
  broadcast('bottlenecks:update', { bottlenecks: state.bottlenecks, detectedAt: new Date().toISOString() });
}

async function pollSelfHealing() {
  try {
    const data = await fetchSelfHealingData();
    state.selfHealing = data; state.lastPollAt.selfHealing = new Date().toISOString();
    broadcast('selfhealing:update', { ...data, fetchedAt: state.lastPollAt.selfHealing });
    const total = data.repos.reduce((s, r) => s + r.runs.length, 0);
    console.log(`[Poller] SelfHealing: ${data.repos.length} repos, ${total} total runs.`);
  } catch (err) { console.error('[Poller] SelfHealing poll failed:', err.message); }
}

function start(broadcastFn) {
  broadcast = broadcastFn;
  pollCI();
  setTimeout(pollJira,        4000);
  setTimeout(pollTests,       8000);
  setTimeout(pollSelfHealing, 12000);
  setInterval(pollCI,           config.poll.githubIntervalSeconds      * 1000);
  setInterval(pollJira,         config.poll.jiraIntervalSeconds         * 1000);
  setInterval(pollTests,        config.poll.testIntervalSeconds         * 1000);
  setInterval(pollSelfHealing,  config.poll.selfHealingIntervalSeconds  * 1000);
  console.log(`[Poller] Started.`);
}

function getState() { return state; }

async function pollSelfHealingNow() {
  const cache = require('./cache');
  config.selfHealing.repos.forEach(r => {
    cache.del(`sh:dashboard:${r.owner}/${r.repo}`);
    cache.del(`sh:runs:${r.owner}/${r.repo}`);
    cache.del(`sh:workflows:${r.owner}/${r.repo}`);
    cache.del(`sh:cisummary:${r.owner}/${r.repo}`);
  });
  await pollSelfHealing();
}

module.exports = { start, getState, pollSelfHealingNow };
