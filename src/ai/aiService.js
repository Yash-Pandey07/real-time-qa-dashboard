/**
 * AI Service — Orchestrator
 * Runs anomaly detection, predictions, and insights generation in sequence,
 * returning a unified AI analysis object.
 */
import { detectAnomalies } from './anomalyDetector.js';
import { generatePredictions } from './predictiveEngine.js';
import { generateInsights } from './insightsEngine.js';

/**
 * Run the full AI analysis pipeline.
 * @param {Array} suites - Array of test suite objects with trend data.
 * @returns {Object} Unified AI analysis result.
 */
export function runAIAnalysis(suites) {
  const startTime = performance.now();

  // Step 1: Anomaly Detection
  const anomalies = detectAnomalies(suites);

  // Step 2: Predictive Analytics
  const predictions = generatePredictions(suites);

  // Step 3: Insights Generation (uses outputs from steps 1 & 2)
  const insights = generateInsights(suites, anomalies, predictions);

  const analysisTime = Math.round(performance.now() - startTime);

  return {
    anomalies,
    predictions,
    insights,
    meta: {
      analysisTime,           // ms
      suitesAnalyzed: suites.length,
      timestamp: new Date().toISOString(),
      engines: [
        'Anomaly Detection (Z-Score, IQR, EWMA)',
        'Predictive Analytics (Linear Regression, EWMA Forecast)',
        'Insights Engine (Pearson Correlation, NL Generation)',
      ],
    },
  };
}
