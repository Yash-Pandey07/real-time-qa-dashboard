/**
 * Test suite metrics engine.
 * Uses the analysis data from the bottleneck report as the baseline,
 * with realistic real-time variations on each refresh to simulate a live pipeline.
 */
import { rand, randInt, clamp } from '../utils/helpers.js';

/** Base suite definitions from our analysis */
const BASE_SUITES = [
  { name: 'Auth Service',       basePassed: 42, baseFailed: 18, baseAvg: 8.7, baseFlaky: 4, icon: '🔐' },
  { name: 'Payment API',        basePassed: 61, baseFailed: 3,  baseAvg: 2.1, baseFlaky: 1, icon: '💳' },
  { name: 'User Onboarding',    basePassed: 28, baseFailed: 9,  baseAvg: 6.4, baseFlaky: 2, icon: '👤' },
  { name: 'Search & Indexing',  basePassed: 19, baseFailed: 11, baseAvg: 9.2, baseFlaky: 2, icon: '🔍' },
  { name: 'Notification Svc',   basePassed: 38, baseFailed: 2,  baseAvg: 1.8, baseFlaky: 0, icon: '🔔' },
  { name: 'File Upload',        basePassed: 33, baseFailed: 4,  baseAvg: 2.9, baseFlaky: 0, icon: '📁' },
];

/** Generate a single suite snapshot with randomized variation */
function generateSuiteSnapshot(base) {
  const passVariation = randInt(-3, 3);
  const failVariation = randInt(-2, 2);
  const passed = clamp(base.basePassed + passVariation, 0, base.basePassed + 5);
  const failed = clamp(base.baseFailed + failVariation, 0, base.baseFailed + 5);
  const total = passed + failed;
  const failRate = total > 0 ? (failed / total) * 100 : 0;
  const avgTime = clamp(base.baseAvg + rand(-0.5, 0.5), 0.5, 15);
  const flaky = clamp(base.baseFlaky + randInt(-1, 1), 0, base.baseFlaky + 2);

  return {
    name: base.name,
    icon: base.icon,
    passed,
    failed,
    total,
    failRate: Math.round(failRate * 10) / 10,
    avgTime: Math.round(avgTime * 10) / 10,
    flaky,
  };
}

/** Generate historical trend data for the last 7 days */
function generateTrendData(base) {
  const days = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const dayLabel = d.toLocaleDateString('en-US', { weekday: 'short' });
    const total = base.basePassed + base.baseFailed + randInt(-5, 5);
    const failed = clamp(base.baseFailed + randInt(-3, 3), 0, total);
    const failRate = total > 0 ? (failed / total) * 100 : 0;
    days.push({
      label: dayLabel,
      failRate: Math.round(failRate * 10) / 10,
      avgTime: clamp(base.baseAvg + rand(-1, 1), 0.5, 15),
    });
  }
  return days;
}

/**
 * Get all suite metrics — called on each refresh.
 * Returns current snapshots + the historical trend data.
 */
export function getTestMetrics() {
  const suites = BASE_SUITES.map(base => {
    const snapshot = generateSuiteSnapshot(base);
    const trend = generateTrendData(base);
    return { ...snapshot, trend };
  });

  // Aggregate KPIs
  const totalPassed = suites.reduce((s, x) => s + x.passed, 0);
  const totalFailed = suites.reduce((s, x) => s + x.failed, 0);
  const totalTests = totalPassed + totalFailed;
  const overallFailRate = totalTests > 0 ? Math.round((totalFailed / totalTests) * 1000) / 10 : 0;
  const totalFlaky = suites.reduce((s, x) => s + x.flaky, 0);
  const avgPipelineTime = Math.round(suites.reduce((s, x) => s + x.avgTime, 0) * 10) / 10;
  const healthScore = Math.round(clamp(100 - overallFailRate * 2.5 - totalFlaky * 2, 0, 100));

  return {
    suites,
    kpis: {
      totalTests,
      totalPassed,
      totalFailed,
      overallFailRate,
      totalFlaky,
      avgPipelineTime,
      healthScore,
      suitesCount: suites.length,
    },
  };
}

/**
 * Bottleneck analysis data — static insights from our earlier analysis.
 */
export function getBottlenecks() {
  return [
    {
      suite: 'Search & Indexing',
      severity: 'P0',
      failRate: '36.7%',
      reason: 'Highest failure rate (36.7%) and slowest execution (9.2 min). Index propagation timing issues.',
      fix: 'Quarantine 11 failing tests; add explicit waits for index propagation.',
    },
    {
      suite: 'Auth Service',
      severity: 'P0',
      failRate: '30.0%',
      reason: '30% failure rate with 4 flaky tests — most flakiness in pipeline. Token expiry races.',
      fix: 'Fix 4 flaky tests; isolate per-test user provisioning.',
    },
    {
      suite: 'User Onboarding',
      severity: 'P1',
      failRate: '24.3%',
      reason: '24.3% failure rate from cascading multi-step flow failures.',
      fix: 'Add cascade guards; decompose into independently testable stages.',
    },
  ];
}
