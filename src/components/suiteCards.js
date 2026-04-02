/**
 * Suite Cards component — grid of test suite cards with mini donut charts and AI badges.
 */
import { Chart, DoughnutController, ArcElement, Tooltip } from 'chart.js';
import { healthLabel, fmtMin } from '../utils/helpers.js';

Chart.register(DoughnutController, ArcElement, Tooltip);

const chartInstances = {};

export function renderSuiteCards(suites, aiData) {
  const container = document.getElementById('suite-cards');

  // Build prediction lookup
  const predMap = {};
  if (aiData?.predictions?.predictions) {
    aiData.predictions.predictions.forEach(p => { predMap[p.suite] = p; });
  }

  // Build anomaly lookup
  const anomalyMap = {};
  if (aiData?.anomalies) {
    aiData.anomalies.failureRateAnomalies.forEach(a => { anomalyMap[a.label] = a; });
  }

  container.innerHTML = suites.map((s, i) => {
    const badgeClass = s.failRate >= 25 ? 'critical' : s.failRate >= 10 ? 'warning' : 'healthy';
    const trendIcon = getTrendIcon(s);
    const pred = predMap[s.name];
    const anomaly = anomalyMap[s.name];

    return `
      <div class="suite-card" id="suite-card-${i}">
        <div class="suite-card-header">
          <span class="suite-name">${s.icon} ${s.name}</span>
          <div class="suite-badges">
            ${anomaly ? `<span class="ai-anomaly-badge ${anomaly.severity}" title="Z-score: ${anomaly.zScore}">⚡ Anomaly</span>` : ''}
            <span class="health-badge ${badgeClass}">${healthLabel(s.failRate)}</span>
          </div>
        </div>
        <div class="suite-card-body">
          <div class="suite-chart-wrap">
            <canvas id="suite-donut-${i}" width="76" height="76"></canvas>
            <div class="suite-chart-center">${Math.round(100 - s.failRate)}%</div>
          </div>
          <div class="suite-stats">
            <div class="stat-item">
              <span class="stat-label">Passed</span>
              <span class="stat-value pass">${s.passed}</span>
            </div>
            <div class="stat-item">
              <span class="stat-label">Failed</span>
              <span class="stat-value fail">${s.failed}</span>
            </div>
            <div class="stat-item">
              <span class="stat-label">Flaky</span>
              <span class="stat-value flaky">${s.flaky}</span>
            </div>
            <div class="stat-item">
              <span class="stat-label">Avg Time</span>
              <span class="stat-value time">${fmtMin(s.avgTime)}</span>
            </div>
          </div>
        </div>
        ${pred ? `
        <div class="suite-ai-prediction">
          <span class="pred-icon">${pred.direction === 'worsening' ? '📈' : pred.direction === 'improving' ? '📉' : '➡️'}</span>
          <span class="pred-text">AI Forecast: <strong class="${pred.direction}">${pred.predictedFailRate}%</strong></span>
          <span class="pred-conf ${pred.confidence.level}">${pred.confidence.label}</span>
        </div>
        ` : ''}
        <div class="suite-footer">
          ${trendIcon} Fail rate: ${s.failRate}% &nbsp;·&nbsp; ${s.total} total tests
        </div>
      </div>
    `;
  }).join('');

  // Create donut charts
  suites.forEach((s, i) => {
    createDonut(i, s);
  });
}

function createDonut(index, suite) {
  const canvas = document.getElementById(`suite-donut-${index}`);
  if (!canvas) return;

  // Destroy previous instance
  if (chartInstances[index]) {
    chartInstances[index].destroy();
  }

  const ctx = canvas.getContext('2d');
  chartInstances[index] = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: ['Passed', 'Failed', 'Flaky'],
      datasets: [{
        data: [suite.passed, suite.failed, suite.flaky],
        backgroundColor: [
          'rgba(34, 197, 94, 0.85)',
          'rgba(239, 68, 68, 0.85)',
          'rgba(245, 158, 11, 0.85)',
        ],
        borderWidth: 0,
        hoverOffset: 4,
      }],
    },
    options: {
      cutout: '68%',
      responsive: false,
      maintainAspectRatio: true,
      plugins: {
        tooltip: {
          backgroundColor: 'rgba(17, 24, 39, 0.95)',
          titleColor: '#f1f5f9',
          bodyColor: '#94a3b8',
          borderColor: 'rgba(255,255,255,0.1)',
          borderWidth: 1,
          cornerRadius: 8,
          padding: 8,
          bodyFont: { family: 'Inter', size: 11 },
        },
        legend: { display: false },
      },
      animation: {
        animateRotate: true,
        duration: 800,
      },
    },
  });
}

function getTrendIcon(suite) {
  const lastDayRate = suite.trend?.[suite.trend.length - 1]?.failRate || 0;
  const prevDayRate = suite.trend?.[suite.trend.length - 2]?.failRate || 0;
  if (lastDayRate > prevDayRate + 1) return '<span class="trend-up">▲ Rising</span>';
  if (lastDayRate < prevDayRate - 1) return '<span class="trend-down">▼ Falling</span>';
  return '<span class="trend-flat">● Stable</span>';
}
