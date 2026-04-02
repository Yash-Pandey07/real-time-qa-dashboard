/** Format a number with commas */
export function formatNumber(n) {
  return n.toLocaleString('en-US');
}

/** Animate a counter from 0 to target */
export function animateCounter(el, target, duration = 1200, suffix = '') {
  const start = performance.now();
  const from = 0;
  function tick(now) {
    const elapsed = now - start;
    const progress = Math.min(elapsed / duration, 1);
    const eased = 1 - Math.pow(1 - progress, 3); // ease-out cubic
    const current = Math.round(from + (target - from) * eased);
    el.textContent = formatNumber(current) + suffix;
    if (progress < 1) requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);
}

/** Get relative time string */
export function timeAgo(date) {
  const seconds = Math.floor((Date.now() - new Date(date).getTime()) / 1000);
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

/** Generate a random number within a range */
export function rand(min, max) {
  return Math.random() * (max - min) + min;
}

/** Generate a random integer within a range */
export function randInt(min, max) {
  return Math.floor(rand(min, max + 1));
}

/** Pick a random item from array */
export function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

/** Clamp a value between min and max */
export function clamp(val, min, max) {
  return Math.max(min, Math.min(max, val));
}

/** Health color based on failure rate */
export function healthColor(failRate) {
  if (failRate >= 25) return 'var(--clr-danger)';
  if (failRate >= 10) return 'var(--clr-warning)';
  return 'var(--clr-success)';
}

/** Health label */
export function healthLabel(failRate) {
  if (failRate >= 25) return 'Critical';
  if (failRate >= 10) return 'Warning';
  return 'Healthy';
}

/** Health dot */
export function healthDot(failRate) {
  if (failRate >= 25) return '🔴';
  if (failRate >= 10) return '🟡';
  return '🟢';
}

/** Format minutes with 1 decimal */
export function fmtMin(v) {
  return v.toFixed(1) + ' min';
}

/** Create DOM element with class and optional inner HTML */
export function el(tag, className, innerHTML) {
  const e = document.createElement(tag);
  if (className) e.className = className;
  if (innerHTML !== undefined) e.innerHTML = innerHTML;
  return e;
}
