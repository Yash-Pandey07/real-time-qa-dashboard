/**
 * Predictive Forecast Panel — shows AI-predicted failure rates per suite.
 */

export function renderPredictivePanel(aiData) {
  const container = document.getElementById('predictions-content');
  if (!container || !aiData) return;

  const { predictions } = aiData;
  const preds = predictions.predictions || [];

  container.innerHTML = `
    <div class="pred-summary-row">
      <div class="pred-summary-item">
        <span class="pred-summary-label">Avg Predicted Fail Rate</span>
        <span class="pred-summary-value">${predictions.summary.avgPredictedFailRate}%</span>
      </div>
      <div class="pred-summary-item">
        <span class="pred-summary-label">High Risk Suites</span>
        <span class="pred-summary-value ${predictions.summary.highRiskCount > 0 ? 'danger' : ''}">${predictions.summary.highRiskCount}</span>
      </div>
      <div class="pred-summary-item">
        <span class="pred-summary-label">Pipeline Direction</span>
        <span class="pred-summary-value ${predictions.summary.overallDirection === 'degrading' ? 'danger' : predictions.summary.overallDirection === 'improving' ? 'success' : ''}">${directionIcon(predictions.summary.overallDirection)} ${capitalize(predictions.summary.overallDirection)}</span>
      </div>
    </div>
    <div class="pred-list">
      ${preds.map(p => `
        <div class="pred-card">
          <div class="pred-card-header">
            <span class="pred-suite-name">${p.icon} ${p.suite}</span>
            <span class="pred-confidence ${p.confidence.level}">${p.confidence.label}</span>
          </div>
          <div class="pred-card-body">
            <div class="pred-rates">
              <span class="pred-current">${p.currentFailRate}%</span>
              <span class="pred-arrow ${p.direction}">${directionArrow(p.direction)}</span>
              <span class="pred-predicted ${p.direction}">${p.predictedFailRate}%</span>
            </div>
            <div class="pred-risk-bar">
              <div class="pred-risk-fill" style="width:${p.riskScore}%; background:${riskColor(p.riskScore)}"></div>
            </div>
            <div class="pred-velocity">${velocityLabel(p.velocity)}</div>
          </div>
        </div>
      `).join('')}
    </div>
  `;
}

function directionIcon(d) {
  if (d === 'degrading') return '📈';
  if (d === 'improving') return '📉';
  return '➡️';
}

function directionArrow(d) {
  if (d === 'worsening') return '→';
  if (d === 'improving') return '→';
  return '→';
}

function riskColor(score) {
  if (score >= 70) return 'var(--clr-danger)';
  if (score >= 40) return 'var(--clr-warning)';
  return 'var(--clr-success)';
}

function velocityLabel(v) {
  const labels = {
    accelerating_up: '⚡ Accelerating upward',
    rising: '📈 Rising',
    stable: '➡️ Stable',
    falling: '📉 Falling',
    accelerating_down: '⚡ Accelerating downward',
  };
  return `<span class="velocity-tag ${v.trend}">${labels[v.trend] || '➡️ Stable'}</span>`;
}

function capitalize(s) {
  return s ? s.charAt(0).toUpperCase() + s.slice(1) : '';
}
