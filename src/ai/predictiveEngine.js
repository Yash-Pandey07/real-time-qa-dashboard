/**
 * Predictive Analytics Engine
 * Uses linear regression and EWMA to forecast test suite metrics.
 *
 * Methods:
 *   1. Linear Regression — least-squares fit on 7-day trend data
 *   2. EWMA Forecasting — exponentially weighted prediction
 *   3. Velocity Calculation — rate of change (accelerating vs decelerating)
 */

/**
 * Simple linear regression: y = mx + b
 * @param {number[]} y - dependent variable values
 * @returns {{ slope: number, intercept: number, r2: number }}
 */
function linearRegression(y) {
  const n = y.length;
  if (n < 2) return { slope: 0, intercept: y[0] || 0, r2: 0 };

  const x = Array.from({ length: n }, (_, i) => i);
  const sumX = x.reduce((s, v) => s + v, 0);
  const sumY = y.reduce((s, v) => s + v, 0);
  const sumXY = x.reduce((s, v, i) => s + v * y[i], 0);
  const sumX2 = x.reduce((s, v) => s + v * v, 0);

  const denom = n * sumX2 - sumX * sumX;
  if (denom === 0) return { slope: 0, intercept: sumY / n, r2: 0 };

  const slope = (n * sumXY - sumX * sumY) / denom;
  const intercept = (sumY - slope * sumX) / n;

  // R² (coefficient of determination)
  const meanY = sumY / n;
  const ssRes = y.reduce((s, v, i) => s + (v - (slope * i + intercept)) ** 2, 0);
  const ssTot = y.reduce((s, v) => s + (v - meanY) ** 2, 0);
  const r2 = ssTot === 0 ? 1 : 1 - ssRes / ssTot;

  return { slope: Math.round(slope * 100) / 100, intercept: Math.round(intercept * 100) / 100, r2: Math.round(r2 * 100) / 100 };
}

/**
 * EWMA forecast — predict next value using exponential smoothing.
 */
function ewmaForecast(values, alpha = 0.3) {
  if (values.length === 0) return 0;
  let ewma = values[0];
  for (let i = 1; i < values.length; i++) {
    ewma = alpha * values[i] + (1 - alpha) * ewma;
  }
  return Math.round(ewma * 10) / 10;
}

/**
 * Calculate velocity (rate of change) and acceleration.
 */
function calculateVelocity(values) {
  if (values.length < 2) return { velocity: 0, acceleration: 0, trend: 'stable' };

  // Recent velocity (last 3 points)
  const recent = values.slice(-3);
  const velocity = recent.length >= 2
    ? (recent[recent.length - 1] - recent[0]) / (recent.length - 1)
    : 0;

  // Acceleration (change in velocity)
  const firstHalf = values.slice(0, Math.ceil(values.length / 2));
  const secondHalf = values.slice(Math.floor(values.length / 2));
  const v1 = firstHalf.length >= 2 ? (firstHalf[firstHalf.length - 1] - firstHalf[0]) / (firstHalf.length - 1) : 0;
  const v2 = secondHalf.length >= 2 ? (secondHalf[secondHalf.length - 1] - secondHalf[0]) / (secondHalf.length - 1) : 0;
  const acceleration = v2 - v1;

  let trend = 'stable';
  if (velocity > 1) trend = acceleration > 0.5 ? 'accelerating_up' : 'rising';
  else if (velocity < -1) trend = acceleration < -0.5 ? 'accelerating_down' : 'falling';

  return {
    velocity: Math.round(velocity * 100) / 100,
    acceleration: Math.round(acceleration * 100) / 100,
    trend,
  };
}

/**
 * Determine confidence level based on R² and data consistency.
 */
function confidenceLevel(r2, dataPoints) {
  if (dataPoints < 4) return { level: 'low', score: 30, label: 'Low' };
  if (r2 >= 0.7 && dataPoints >= 6) return { level: 'high', score: 85, label: 'High' };
  if (r2 >= 0.4) return { level: 'medium', score: 60, label: 'Medium' };
  return { level: 'low', score: 35, label: 'Low' };
}

/**
 * Generate predictions for all suites.
 * @param {Array} suites - Suite objects with trend data.
 * @returns {Object} Predictions analysis.
 */
export function generatePredictions(suites) {
  const predictions = suites.map(suite => {
    const trendData = (suite.trend || []).map(t => t.failRate);
    const timeData = (suite.trend || []).map(t => t.avgTime || suite.avgTime);

    // Linear regression on failure rate trend
    const failReg = linearRegression(trendData);
    const nextDayFailRate = Math.max(0, Math.min(100,
      Math.round((failReg.slope * trendData.length + failReg.intercept) * 10) / 10
    ));

    // EWMA forecast
    const ewmaPrediction = ewmaForecast(trendData);

    // Blended prediction (60% regression, 40% EWMA)
    const blendedPrediction = Math.round((nextDayFailRate * 0.6 + ewmaPrediction * 0.4) * 10) / 10;

    // Velocity analysis
    const velocity = calculateVelocity(trendData);

    // Confidence
    const confidence = confidenceLevel(failReg.r2, trendData.length);

    // Risk assessment
    const riskScore = Math.round(Math.min(100,
      blendedPrediction * 1.5 +
      (velocity.velocity > 0 ? velocity.velocity * 10 : 0) +
      suite.flaky * 5 +
      (suite.avgTime > 5 ? 15 : 0)
    ));

    const direction = blendedPrediction > suite.failRate + 1 ? 'worsening'
      : blendedPrediction < suite.failRate - 1 ? 'improving'
      : 'stable';

    return {
      suite: suite.name,
      icon: suite.icon,
      currentFailRate: suite.failRate,
      predictedFailRate: blendedPrediction,
      regressionPrediction: nextDayFailRate,
      ewmaPrediction,
      regression: failReg,
      velocity,
      confidence,
      riskScore,
      direction,
      message: generatePredictionMessage(suite.name, suite.failRate, blendedPrediction, velocity, direction),
    };
  });

  // Sort by risk score descending
  predictions.sort((a, b) => b.riskScore - a.riskScore);

  // Overall pipeline prediction
  const avgPredictedFailRate = Math.round(
    predictions.reduce((s, p) => s + p.predictedFailRate, 0) / predictions.length * 10
  ) / 10;

  const highRiskCount = predictions.filter(p => p.riskScore >= 60).length;

  return {
    predictions,
    summary: {
      avgPredictedFailRate,
      highRiskCount,
      overallDirection: avgPredictedFailRate > 18 ? 'degrading' : avgPredictedFailRate < 12 ? 'improving' : 'stable',
    },
  };
}

/**
 * Generate a human-readable prediction message.
 */
function generatePredictionMessage(name, current, predicted, velocity, direction) {
  const diff = Math.abs(predicted - current).toFixed(1);
  if (direction === 'worsening') {
    const urgency = velocity.trend.includes('accelerating') ? '⚠️ Rapidly worsening' : '📈 Trending up';
    return `${urgency}: ${name} failure rate predicted to rise from ${current}% → ${predicted}% (+${diff}%)`;
  }
  if (direction === 'improving') {
    return `📉 Improving: ${name} failure rate predicted to drop from ${current}% → ${predicted}% (-${diff}%)`;
  }
  return `➡️ Stable: ${name} failure rate expected to hold around ${predicted}%`;
}
