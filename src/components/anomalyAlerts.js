/**
 * Anomaly Alerts Panel — real-time anomaly detection alerts.
 */

export function renderAnomalyAlerts(aiData) {
  const container = document.getElementById('anomaly-alerts-content');
  if (!container || !aiData) return;

  const { anomalies } = aiData;
  const allAnomalies = [
    ...anomalies.failureRateAnomalies.map(a => ({ ...a, category: 'Failure Rate' })),
    ...anomalies.executionTimeAnomalies.map(a => ({ ...a, category: 'Exec Time' })),
    ...anomalies.trendShifts.map(a => ({ ...a, category: 'Trend Shift' })),
    ...anomalies.flakySpikes.map(a => ({ ...a, category: 'Flaky Spike' })),
  ];

  if (allAnomalies.length === 0) {
    container.innerHTML = `
      <div class="anomaly-empty">
        <span class="anomaly-empty-icon">✅</span>
        <div>No anomalies detected</div>
        <div class="anomaly-empty-sub">All metrics within expected ranges</div>
      </div>
    `;
    return;
  }

  container.innerHTML = `
    <div class="anomaly-summary">
      <span class="anomaly-count ${anomalies.overallSeverity}">${anomalies.totalAnomalies}</span>
      <span class="anomaly-summary-text">anomal${anomalies.totalAnomalies === 1 ? 'y' : 'ies'} detected</span>
    </div>
    <div class="anomaly-list">
      ${allAnomalies.slice(0, 6).map(a => `
        <div class="anomaly-alert ${a.severity}">
          <div class="anomaly-alert-header">
            <span class="anomaly-type-badge">${a.category}</span>
            <span class="anomaly-severity-dot ${a.severity}"></span>
          </div>
          <div class="anomaly-alert-msg">${a.message}</div>
        </div>
      `).join('')}
    </div>
  `;
}
