/**
 * Header component — logo, title, live clock, refresh button.
 */
export function renderHeader(lastUpdated) {
  const header = document.getElementById('dashboard-header');

  header.innerHTML = `
    <div class="header-left">
      <div class="header-logo">QA</div>
      <div>
        <div class="header-title">AI-Powered QA Dashboard</div>
        <div class="header-subtitle">Real-Time Anomaly Detection · Predictive Analytics · Intelligent Bottleneck Analysis</div>
      </div>
    </div>
    <div class="header-right">
      <div>
        <div class="live-clock" id="live-clock"></div>
        <div class="last-updated" id="last-updated">Last updated: just now</div>
      </div>
      <button class="refresh-btn" id="refresh-btn">
        <span class="spin">⟳</span> Refresh
      </button>
    </div>
  `;

  // Start clock
  updateClock();
  setInterval(updateClock, 1000);

  if (lastUpdated) updateLastUpdated(lastUpdated);
}

function updateClock() {
  const el = document.getElementById('live-clock');
  if (el) {
    const now = new Date();
    el.textContent = now.toLocaleString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true,
    });
  }
}

export function updateLastUpdated(isoString) {
  const el = document.getElementById('last-updated');
  if (el) {
    const d = new Date(isoString);
    el.textContent = `Last updated: ${d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}`;
  }
}
