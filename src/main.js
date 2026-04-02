/**
 * AI-Powered QA Pipeline Dashboard — Main Entry Point
 * Initializes all components, sets up data refresh loop, and wires event handlers.
 */
import './styles/index.css';
import { fetchDashboardData } from './api/dataService.js';
import { renderHeader, updateLastUpdated } from './components/header.js';
import { renderKPIs } from './components/kpiStrip.js';
import { renderSuiteCards } from './components/suiteCards.js';
import { renderCharts } from './components/charts.js';
import { renderBottlenecks } from './components/bottlenecks.js';
import { renderCICDPanel } from './components/cicdPanel.js';
import { renderActivityFeed } from './components/activityFeed.js';
import { renderAIInsights } from './components/aiInsights.js';
import { renderAnomalyAlerts } from './components/anomalyAlerts.js';
import { renderPredictivePanel } from './components/predictivePanel.js';

const REFRESH_INTERVAL = 30_000; // 30 seconds
let refreshTimer = null;

/**
 * Main render — fetches data and renders all components.
 */
async function render() {
  try {
    const data = await fetchDashboardData();

    renderKPIs(data.kpis);

    // AI panels
    renderAIInsights(data.ai);
    renderAnomalyAlerts(data.ai);
    renderPredictivePanel(data.ai);

    renderSuiteCards(data.suites, data.ai);
    renderCharts(data.suites);
    renderBottlenecks(data.bottlenecks);
    renderCICDPanel(data.cicd);
    renderActivityFeed(data.cicd);
    updateLastUpdated(data.lastUpdated);

    hideLoading();
  } catch (err) {
    console.error('Dashboard render error:', err);
    hideLoading();
  }
}

/**
 * Show/hide the loading overlay.
 */
function showLoading() {
  let overlay = document.getElementById('loading-overlay');
  if (!overlay) {
    overlay = document.createElement('div');
    overlay.id = 'loading-overlay';
    overlay.className = 'loading-overlay';
    overlay.innerHTML = '<div class="loader"></div>';
    document.body.appendChild(overlay);
  }
  overlay.classList.remove('hide');
}

function hideLoading() {
  const overlay = document.getElementById('loading-overlay');
  if (overlay) {
    overlay.classList.add('hide');
    setTimeout(() => overlay.remove(), 500);
  }
}

/**
 * Set up auto-refresh and manual refresh button.
 */
function setupRefresh() {
  // Manual refresh button
  document.addEventListener('click', (e) => {
    if (e.target.closest('#refresh-btn')) {
      clearInterval(refreshTimer);
      render();
      refreshTimer = setInterval(render, REFRESH_INTERVAL);
    }
  });

  // Auto-refresh
  refreshTimer = setInterval(render, REFRESH_INTERVAL);
}

/**
 * Initialize the dashboard.
 */
async function init() {
  showLoading();
  renderHeader();
  await render();
  setupRefresh();

  console.log(
    '%c 🧠 AI-Powered QA Dashboard %c Loaded — 3 AI engines active ',
    'background: linear-gradient(135deg, #6366f1, #8b5cf6); color: white; padding: 4px 8px; border-radius: 4px 0 0 4px; font-weight: 700;',
    'background: #1e293b; color: #94a3b8; padding: 4px 8px; border-radius: 0 4px 4px 0;'
  );
}

// Boot
init();
