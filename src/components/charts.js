/**
 * Charts component — Failure Rate Trend (line) and Execution Time (bar).
 */
import {
  Chart, LineController, BarController, LineElement, BarElement,
  PointElement, CategoryScale, LinearScale, Tooltip, Legend, Filler
} from 'chart.js';

Chart.register(
  LineController, BarController, LineElement, BarElement,
  PointElement, CategoryScale, LinearScale, Tooltip, Legend, Filler
);

let failureTrendChart = null;
let execTimeChart = null;

const SUITE_COLORS = [
  { line: '#ef4444', bg: 'rgba(239, 68, 68, 0.1)' },  // Auth - red
  { line: '#22c55e', bg: 'rgba(34, 197, 94, 0.1)' },   // Payment - green
  { line: '#f59e0b', bg: 'rgba(245, 158, 11, 0.1)' },  // Onboarding - amber
  { line: '#8b5cf6', bg: 'rgba(139, 92, 246, 0.1)' },  // Search - purple
  { line: '#3b82f6', bg: 'rgba(59, 130, 246, 0.1)' },  // Notification - blue
  { line: '#06b6d4', bg: 'rgba(6, 182, 212, 0.1)' },   // File Upload - cyan
];

const CHART_DEFAULTS = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    tooltip: {
      backgroundColor: 'rgba(17, 24, 39, 0.95)',
      titleColor: '#f1f5f9',
      bodyColor: '#94a3b8',
      borderColor: 'rgba(255,255,255,0.1)',
      borderWidth: 1,
      cornerRadius: 8,
      padding: 10,
      bodyFont: { family: 'Inter', size: 11 },
      titleFont: { family: 'Inter', size: 12, weight: '600' },
    },
    legend: {
      position: 'bottom',
      labels: {
        color: '#94a3b8',
        font: { family: 'Inter', size: 11 },
        usePointStyle: true,
        pointStyle: 'circle',
        padding: 16,
      },
    },
  },
  scales: {
    x: {
      grid: { color: 'rgba(255,255,255,0.04)' },
      ticks: { color: '#64748b', font: { family: 'Inter', size: 11 } },
    },
    y: {
      grid: { color: 'rgba(255,255,255,0.04)' },
      ticks: { color: '#64748b', font: { family: 'Inter', size: 11 } },
    },
  },
};

export function renderCharts(suites) {
  renderFailureTrend(suites);
  renderExecTime(suites);
}

function renderFailureTrend(suites) {
  const canvas = document.getElementById('failureTrendCanvas');
  if (!canvas) return;

  if (failureTrendChart) failureTrendChart.destroy();

  const labels = suites[0].trend.map(t => t.label);

  const datasets = suites.map((s, i) => ({
    label: s.name,
    data: s.trend.map(t => t.failRate),
    borderColor: SUITE_COLORS[i].line,
    backgroundColor: SUITE_COLORS[i].bg,
    fill: false,
    tension: 0.4,
    borderWidth: 2,
    pointRadius: 3,
    pointHoverRadius: 6,
    pointBackgroundColor: SUITE_COLORS[i].line,
  }));

  failureTrendChart = new Chart(canvas.getContext('2d'), {
    type: 'line',
    data: { labels, datasets },
    options: {
      ...CHART_DEFAULTS,
      scales: {
        ...CHART_DEFAULTS.scales,
        y: {
          ...CHART_DEFAULTS.scales.y,
          title: { display: true, text: 'Failure Rate (%)', color: '#64748b', font: { family: 'Inter', size: 11 } },
          beginAtZero: true,
        },
      },
      animation: { duration: 800, easing: 'easeOutQuart' },
    },
  });
}

function renderExecTime(suites) {
  const canvas = document.getElementById('execTimeCanvas');
  if (!canvas) return;

  if (execTimeChart) execTimeChart.destroy();

  execTimeChart = new Chart(canvas.getContext('2d'), {
    type: 'bar',
    data: {
      labels: suites.map(s => s.name),
      datasets: [{
        label: 'Avg Time (min)',
        data: suites.map(s => s.avgTime),
        backgroundColor: suites.map((s, i) => SUITE_COLORS[i].line + '99'),
        borderColor: suites.map((s, i) => SUITE_COLORS[i].line),
        borderWidth: 1,
        borderRadius: 6,
        barThickness: 32,
      }],
    },
    options: {
      ...CHART_DEFAULTS,
      indexAxis: 'y',
      plugins: {
        ...CHART_DEFAULTS.plugins,
        legend: { display: false },
      },
      scales: {
        ...CHART_DEFAULTS.scales,
        x: {
          ...CHART_DEFAULTS.scales.x,
          title: { display: true, text: 'Minutes', color: '#64748b', font: { family: 'Inter', size: 11 } },
          beginAtZero: true,
        },
      },
      animation: { duration: 800, easing: 'easeOutQuart' },
    },
  });
}
