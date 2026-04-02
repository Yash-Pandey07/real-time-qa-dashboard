/**
 * AI Insights Panel — displays AI-generated analysis with risk score gauge.
 */

export function renderAIInsights(aiData) {
  const container = document.getElementById('ai-insights-content');
  if (!container || !aiData) return;

  const { insights, meta } = aiData;
  const riskScore = insights.riskScore;
  const riskLevel = insights.riskLevel;

  // Risk gauge + insights list
  container.innerHTML = `
    <div class="ai-header-row">
      <div class="ai-risk-gauge">
        <svg viewBox="0 0 120 80" class="risk-arc">
          <path d="M 10 70 A 50 50 0 0 1 110 70" fill="none" stroke="rgba(255,255,255,0.06)" stroke-width="10" stroke-linecap="round"/>
          <path d="M 10 70 A 50 50 0 0 1 110 70" fill="none"
            stroke="${riskLevel === 'critical' ? 'var(--clr-danger)' : riskLevel === 'warning' ? 'var(--clr-warning)' : 'var(--clr-success)'}"
            stroke-width="10" stroke-linecap="round"
            stroke-dasharray="${(riskScore / 100) * 157} 157"
            class="risk-arc-fill"/>
        </svg>
        <div class="risk-value">${riskScore}</div>
        <div class="risk-label">${riskLevel === 'critical' ? 'HIGH RISK' : riskLevel === 'warning' ? 'MODERATE' : 'LOW RISK'}</div>
      </div>
      <div class="ai-meta">
        <div class="ai-meta-item">
          <span class="ai-meta-label">Engines</span>
          <span class="ai-meta-value">${meta.engines.length} Active</span>
        </div>
        <div class="ai-meta-item">
          <span class="ai-meta-label">Analysis Time</span>
          <span class="ai-meta-value">${meta.analysisTime}ms</span>
        </div>
        <div class="ai-meta-item">
          <span class="ai-meta-label">Methods</span>
          <span class="ai-meta-value ai-methods">${insights.modelInfo.anomalyMethods.join(', ')}</span>
        </div>
      </div>
    </div>
    <div class="ai-insights-list">
      ${insights.insights.slice(0, 6).map(ins => `
        <div class="ai-insight-item ${ins.type}">
          <span class="ai-insight-icon">${ins.icon}</span>
          <div class="ai-insight-body">
            <div class="ai-insight-title">${ins.title}</div>
            <div class="ai-insight-text">${ins.text}</div>
          </div>
        </div>
      `).join('')}
    </div>
  `;
}
