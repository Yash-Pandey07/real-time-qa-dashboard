/**
 * KPI strip — top-level metrics cards.
 */
import { animateCounter } from '../utils/helpers.js';

export function renderKPIs(kpis) {
  const strip = document.getElementById('kpi-strip');

  const cards = [
    { label: 'Total Tests',     value: kpis.totalTests,      suffix: '',    cls: 'accent', sub: `Across ${kpis.suitesCount} suites` },
    { label: 'Passed',          value: kpis.totalPassed,      suffix: '',    cls: 'success', sub: `${(100 - kpis.overallFailRate).toFixed(1)}% pass rate` },
    { label: 'Failed',          value: kpis.totalFailed,      suffix: '',    cls: 'danger',  sub: `${kpis.overallFailRate}% failure rate` },
    { label: 'Flaky Tests',     value: kpis.totalFlaky,       suffix: '',    cls: 'warning', sub: 'Causing rerun waste' },
    { label: 'Pipeline Time',   value: kpis.avgPipelineTime,  suffix: ' min', cls: 'info',  sub: 'Sum of suite averages' },
    { label: 'Health Score',    value: kpis.healthScore,      suffix: '/100', cls: kpis.healthScore >= 70 ? 'success' : kpis.healthScore >= 40 ? 'warning' : 'danger', sub: scoreLabel(kpis.healthScore) },
  ];

  strip.innerHTML = cards.map((c, i) => `
    <div class="kpi-card ${c.cls}" style="animation-delay:${i * 0.05}s">
      <div class="kpi-label">${c.label}</div>
      <div class="kpi-value" id="kpi-val-${i}">0</div>
      <div class="kpi-sub">${c.sub}</div>
    </div>
  `).join('');

  // Animate counters
  cards.forEach((c, i) => {
    const el = document.getElementById(`kpi-val-${i}`);
    if (el) animateCounter(el, c.value, 1200, c.suffix);
  });
}

function scoreLabel(score) {
  if (score >= 80) return 'Pipeline is healthy';
  if (score >= 60) return 'Needs attention';
  if (score >= 40) return 'Degraded performance';
  return 'Critical — action required';
}
