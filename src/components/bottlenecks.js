/**
 * Bottleneck Detection panel — highlights top pipeline bottlenecks.
 */
export function renderBottlenecks(bottlenecks) {
  const container = document.getElementById('bottleneck-list');
  if (!container) return;

  container.innerHTML = bottlenecks.map(bn => `
    <div class="bottleneck-item">
      <div class="bn-header">
        <span class="bn-title">${bn.suite}</span>
        <span class="bn-severity ${bn.severity.toLowerCase()}">${bn.severity}</span>
      </div>
      <div class="bn-desc">${bn.reason}</div>
      <div class="bn-fix">💡 ${bn.fix}</div>
    </div>
  `).join('');
}
