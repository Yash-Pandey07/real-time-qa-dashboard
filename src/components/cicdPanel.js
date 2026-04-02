/**
 * CI/CD Panel — displays real GitHub Actions workflow runs.
 */
import { timeAgo } from '../utils/helpers.js';

export function renderCICDPanel(cicdData) {
  const container = document.getElementById('cicd-list');
  if (!container) return;

  const runs = cicdData?.runs || [];

  if (runs.length === 0) {
    container.innerHTML = `
      <div style="text-align:center; padding:2rem; color:var(--text-muted); font-size:0.8rem;">
        ⏳ Loading CI/CD data from GitHub...
      </div>
    `;
    return;
  }

  container.innerHTML = runs.slice(0, 10).map(run => {
    const statusClass = run.conclusion || run.status;
    const statusLabel = formatStatus(run.conclusion || run.status);
    return `
      <div class="cicd-run">
        <span class="cicd-status ${statusClass}"></span>
        <div class="cicd-info">
          <div class="cicd-repo">${run.repo}</div>
          <div class="cicd-meta">${run.name} · ${run.branch || ''} · ${timeAgo(run.createdAt)}</div>
        </div>
        <a class="cicd-link" href="${run.url}" target="_blank" rel="noopener">View →</a>
      </div>
    `;
  }).join('');
}

function formatStatus(s) {
  switch (s) {
    case 'success': return '✓ Success';
    case 'failure': return '✗ Failed';
    case 'in_progress': return '⟳ Running';
    case 'queued': return '◷ Queued';
    case 'cancelled': return '⊘ Cancelled';
    default: return s || 'Unknown';
  }
}
