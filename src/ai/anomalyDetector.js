/**
 * Anomaly Detection Engine
 * Uses statistical methods to identify unusual patterns in test pipeline data.
 *
 * Methods:
 *   1. Z-Score Analysis — flags metrics deviating >2σ from historical mean
 *   2. IQR (Interquartile Range) — identifies outliers beyond Q1-1.5*IQR / Q3+1.5*IQR
 *   3. EWMA (Exponentially Weighted Moving Average) — detects trend shifts vs normal variance
 */

/**
 * Compute mean and standard deviation of an array.
 */
function stats(arr) {
  const n = arr.length;
  if (n === 0) return { mean: 0, std: 0 };
  const mean = arr.reduce((s, v) => s + v, 0) / n;
  const variance = arr.reduce((s, v) => s + (v - mean) ** 2, 0) / n;
  return { mean, std: Math.sqrt(variance) };
}

/**
 * Z-Score anomaly detection.
 * Returns anomalies where |z| > threshold (default 1.8).
 */
function zScoreDetect(values, labels, threshold = 1.8) {
  const { mean, std } = stats(values);
  if (std === 0) return [];

  const anomalies = [];
  values.forEach((v, i) => {
    const z = (v - mean) / std;
    if (Math.abs(z) > threshold) {
      anomalies.push({
        index: i,
        label: labels[i],
        value: v,
        zScore: Math.round(z * 100) / 100,
        deviation: Math.round(Math.abs(z) * std * 10) / 10,
        direction: z > 0 ? 'above' : 'below',
        severity: Math.abs(z) > 2.5 ? 'critical' : 'warning',
      });
    }
  });
  return anomalies;
}

/**
 * IQR-based outlier detection.
 */
function iqrDetect(values, labels) {
  const sorted = [...values].sort((a, b) => a - b);
  const n = sorted.length;
  const q1 = sorted[Math.floor(n * 0.25)];
  const q3 = sorted[Math.floor(n * 0.75)];
  const iqr = q3 - q1;
  const lowerBound = q1 - 1.5 * iqr;
  const upperBound = q3 + 1.5 * iqr;

  const outliers = [];
  values.forEach((v, i) => {
    if (v < lowerBound || v > upperBound) {
      outliers.push({
        index: i,
        label: labels[i],
        value: v,
        bound: v > upperBound ? 'upper' : 'lower',
        severity: v > q3 + 3 * iqr || v < q1 - 3 * iqr ? 'critical' : 'warning',
      });
    }
  });
  return outliers;
}

/**
 * EWMA (Exponentially Weighted Moving Average) for trend shift detection.
 * Detects when the current value deviates significantly from the smoothed trend.
 */
function ewmaDetect(values, labels, alpha = 0.3, threshold = 1.5) {
  if (values.length < 3) return [];

  const shifts = [];
  let ewma = values[0];
  let ewmaVar = 0;

  for (let i = 1; i < values.length; i++) {
    const prev = ewma;
    ewma = alpha * values[i] + (1 - alpha) * ewma;
    ewmaVar = alpha * (values[i] - ewma) ** 2 + (1 - alpha) * ewmaVar;
    const ewmaStd = Math.sqrt(ewmaVar);

    if (ewmaStd > 0 && Math.abs(values[i] - prev) / ewmaStd > threshold) {
      shifts.push({
        index: i,
        label: labels[i],
        value: values[i],
        expected: Math.round(prev * 10) / 10,
        type: values[i] > prev ? 'spike' : 'drop',
        magnitude: Math.round(Math.abs(values[i] - prev) * 10) / 10,
        severity: Math.abs(values[i] - prev) / ewmaStd > 2.5 ? 'critical' : 'warning',
      });
    }
  }
  return shifts;
}

/**
 * Run full anomaly detection on suite data.
 * @param {Array} suites - Array of suite snapshot objects with trend data.
 * @returns {Object} Anomaly analysis results.
 */
export function detectAnomalies(suites) {
  const results = {
    failureRateAnomalies: [],
    executionTimeAnomalies: [],
    trendShifts: [],
    flakySpikes: [],
    totalAnomalies: 0,
    overallSeverity: 'normal',
  };

  const suiteNames = suites.map(s => s.name);

  // 1. Failure rate anomalies across suites (z-score)
  const failRates = suites.map(s => s.failRate);
  results.failureRateAnomalies = zScoreDetect(failRates, suiteNames).map(a => ({
    ...a,
    metric: 'Failure Rate',
    message: `${a.label} failure rate (${a.value}%) is ${a.zScore > 0 ? 'unusually high' : 'unusually low'} — z-score: ${a.zScore}`,
  }));

  // 2. Execution time anomalies (z-score)
  const execTimes = suites.map(s => s.avgTime);
  results.executionTimeAnomalies = zScoreDetect(execTimes, suiteNames).map(a => ({
    ...a,
    metric: 'Execution Time',
    message: `${a.label} avg time (${a.value} min) deviates significantly — z-score: ${a.zScore}`,
  }));

  // 3. Trend shifts within each suite (EWMA on 7-day failure trend)
  suites.forEach(suite => {
    if (!suite.trend || suite.trend.length < 3) return;
    const trendVals = suite.trend.map(t => t.failRate);
    const trendLabels = suite.trend.map(t => t.label);
    const shifts = ewmaDetect(trendVals, trendLabels);
    shifts.forEach(shift => {
      results.trendShifts.push({
        ...shift,
        suite: suite.name,
        metric: 'Failure Trend',
        message: `${suite.name}: ${shift.type === 'spike' ? '📈 Spike' : '📉 Drop'} detected on ${shift.label} — from ${shift.expected}% to ${shift.value}%`,
      });
    });
  });

  // 4. Flaky test anomalies (IQR)
  const flakyVals = suites.map(s => s.flaky);
  results.flakySpikes = iqrDetect(flakyVals, suiteNames).map(a => ({
    ...a,
    metric: 'Flaky Tests',
    message: `${a.label} has an outlier flaky count (${a.value}) compared to other suites`,
  }));

  // Aggregate
  results.totalAnomalies =
    results.failureRateAnomalies.length +
    results.executionTimeAnomalies.length +
    results.trendShifts.length +
    results.flakySpikes.length;

  const hasCritical = [
    ...results.failureRateAnomalies,
    ...results.executionTimeAnomalies,
    ...results.trendShifts,
    ...results.flakySpikes,
  ].some(a => a.severity === 'critical');

  results.overallSeverity = hasCritical ? 'critical' : results.totalAnomalies > 0 ? 'warning' : 'normal';

  return results;
}
