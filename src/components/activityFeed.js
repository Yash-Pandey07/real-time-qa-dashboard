/**
 * Activity Feed — combines GitHub events with simulated test events.
 */
import { timeAgo, pick } from '../utils/helpers.js';

const TEST_EVENTS = [
  { text: '<strong>Auth Service</strong> suite completed — 42 passed, 18 failed', dot: 'fail' },
  { text: '<strong>Payment API</strong> suite passed — 61/64 tests green', dot: 'pass' },
  { text: '<strong>Search & Indexing</strong> flaky test detected: testSearchReindex', dot: 'flaky' },
  { text: '<strong>Notification Svc</strong> suite passed — all 38 tests green', dot: 'pass' },
  { text: '<strong>User Onboarding</strong> cascade failure in signup flow', dot: 'fail' },
  { text: '<strong>File Upload</strong> suite completed — 33 passed, 4 failed', dot: 'pass' },
  { text: 'Pipeline health score dropped to <strong>62/100</strong>', dot: 'fail' },
  { text: '<strong>Auth Service</strong> flaky test: testTokenRefreshRace', dot: 'flaky' },
  { text: 'Nightly regression suite <strong>triggered</strong>', dot: 'deploy' },
  { text: '<strong>Search & Indexing</strong> — 3 tests quarantined', dot: 'info' },
  { text: 'CI cache hit rate: <strong>87%</strong> (improved +3%)', dot: 'pass' },
  { text: '<strong>Payment API</strong> integration test re-enabled', dot: 'info' },
];

export function renderActivityFeed(cicdData) {
  const container = document.getElementById('activity-list');
  if (!container) return;

  // Merge GitHub events with simulated test events
  const activities = [];

  // Add some simulated test events
  const count = 6 + Math.floor(Math.random() * 4);
  const shuffled = [...TEST_EVENTS].sort(() => Math.random() - 0.5);
  for (let i = 0; i < Math.min(count, shuffled.length); i++) {
    const minutesAgo = i * 3 + Math.floor(Math.random() * 5);
    const time = new Date(Date.now() - minutesAgo * 60000);
    activities.push({
      text: shuffled[i].text,
      dot: shuffled[i].dot,
      time: time.toISOString(),
    });
  }

  // Add GitHub events
  const events = cicdData?.events || [];
  events.slice(0, 6).forEach(ev => {
    activities.push({
      text: `<strong>${ev.repo}</strong> — ${ev.actor}: ${ev.payload}`,
      dot: ev.type === 'PushEvent' ? 'deploy' : 'info',
      time: ev.createdAt,
    });
  });

  // Sort by time descending
  activities.sort((a, b) => new Date(b.time) - new Date(a.time));

  container.innerHTML = activities.slice(0, 15).map(a => `
    <div class="activity-item">
      <span class="activity-dot ${a.dot}"></span>
      <span class="activity-text">${a.text}</span>
      <span class="activity-time">${timeAgo(a.time)}</span>
    </div>
  `).join('');
}
