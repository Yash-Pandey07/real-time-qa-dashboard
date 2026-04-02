/**
 * Central data service — orchestrates GitHub API calls, test metrics, and AI analysis.
 * Exposes a single `fetchDashboardData()` function.
 */
import { fetchAllCICDData } from './github.js';
import { getTestMetrics, getBottlenecks } from './metrics.js';
import { runAIAnalysis } from '../ai/aiService.js';

let cachedCICD = null;
let lastCICDFetch = 0;
const CICD_CACHE_MS = 60_000; // cache GitHub data for 60s to avoid rate limits

/**
 * Fetch all dashboard data.
 * Test metrics are always fresh (simulated), GitHub data is cached for 60s.
 * AI analysis runs on every refresh.
 */
export async function fetchDashboardData() {
  const metrics = getTestMetrics();
  const bottlenecks = getBottlenecks();

  // Fetch GitHub data (with caching)
  const now = Date.now();
  if (!cachedCICD || now - lastCICDFetch > CICD_CACHE_MS) {
    try {
      cachedCICD = await fetchAllCICDData();
      lastCICDFetch = now;
    } catch (err) {
      console.warn('GitHub fetch failed, using cache:', err.message);
      if (!cachedCICD) cachedCICD = { runs: [], events: [] };
    }
  }

  // Run AI analysis on current suite data
  const ai = runAIAnalysis(metrics.suites);

  return {
    ...metrics,
    bottlenecks,
    cicd: cachedCICD,
    ai,
    lastUpdated: new Date().toISOString(),
  };
}

