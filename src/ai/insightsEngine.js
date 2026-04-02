/**
 * AI Insights Generator
 * Synthesizes anomaly detection + predictive analytics into actionable insights.
 *
 * Features:
 *   1. Cross-suite correlation detection
 *   2. Composite risk scoring
 *   3. Natural language insight generation
 *   4. Priority-ranked recommendations
 */

/**
 * Detect correlations between suite failures.
 * If two suites both have high failure rates, they may share a dependency.
 */
function findCorrelations(suites) {
  const correlations = [];
  const highFailSuites = suites.filter(s => s.failRate > 15);

  for (let i = 0; i < highFailSuites.length; i++) {
    for (let j = i + 1; j < highFailSuites.length; j++) {
      const a = highFailSuites[i];
      const b = highFailSuites[j];

      // Check if trends move in the same direction
      const aTrend = (a.trend || []).map(t => t.failRate);
      const bTrend = (b.trend || []).map(t => t.failRate);

      if (aTrend.length >= 3 && bTrend.length >= 3) {
        const corr = pearsonCorrelation(aTrend, bTrend);
        if (corr > 0.6) {
          correlations.push({
            suites: [a.name, b.name],
            correlation: Math.round(corr * 100) / 100,
            message: `📊 ${a.name} and ${b.name} failures are correlated (r=${corr.toFixed(2)}) — likely share a dependency or infrastructure issue`,
            severity: corr > 0.8 ? 'high' : 'medium',
          });
        }
      }
    }
  }
  return correlations;
}

/**
 * Pearson correlation coefficient between two arrays.
 */
function pearsonCorrelation(x, y) {
  const n = Math.min(x.length, y.length);
  if (n < 3) return 0;

  const xSlice = x.slice(0, n);
  const ySlice = y.slice(0, n);

  const meanX = xSlice.reduce((s, v) => s + v, 0) / n;
  const meanY = ySlice.reduce((s, v) => s + v, 0) / n;

  let num = 0, denX = 0, denY = 0;
  for (let i = 0; i < n; i++) {
    const dx = xSlice[i] - meanX;
    const dy = ySlice[i] - meanY;
    num += dx * dy;
    denX += dx * dx;
    denY += dy * dy;
  }

  const den = Math.sqrt(denX * denY);
  return den === 0 ? 0 : num / den;
}

/**
 * Calculate composite risk score for overall pipeline.
 */
function calculatePipelineRisk(suites, anomalies, predictions) {
  // Weighted factors
  const failureWeight = 0.35;
  const anomalyWeight = 0.25;
  const trendWeight = 0.20;
  const flakyWeight = 0.10;
  const timeWeight = 0.10;

  const avgFailRate = suites.reduce((s, x) => s + x.failRate, 0) / suites.length;
  const anomalyScore = Math.min(100, anomalies.totalAnomalies * 15);
  const trendScore = predictions.summary
    ? (predictions.summary.avgPredictedFailRate > avgFailRate ? 70 : 30)
    : 50;
  const flakyScore = Math.min(100, suites.reduce((s, x) => s + x.flaky, 0) * 12);
  const timeScore = Math.min(100, suites.reduce((s, x) => s + Math.max(0, x.avgTime - 3) * 10, 0));

  const raw = avgFailRate * failureWeight
    + anomalyScore * anomalyWeight
    + trendScore * trendWeight
    + flakyScore * flakyWeight
    + timeScore * timeWeight;

  return Math.round(Math.min(100, raw));
}

/**
 * Generate natural language insights from all AI analysis.
 */
function generateNLInsights(suites, anomalies, predictions, correlations, riskScore) {
  const insights = [];

  // 1. Overall health insight
  if (riskScore >= 70) {
    insights.push({
      type: 'critical',
      icon: '🚨',
      title: 'Pipeline at High Risk',
      text: `Overall risk score is ${riskScore}/100. Immediate attention required — multiple suites showing degraded performance.`,
      priority: 1,
    });
  } else if (riskScore >= 40) {
    insights.push({
      type: 'warning',
      icon: '⚠️',
      title: 'Pipeline Needs Attention',
      text: `Risk score at ${riskScore}/100. Some suites are trending negatively, but the situation is manageable with targeted fixes.`,
      priority: 2,
    });
  } else {
    insights.push({
      type: 'success',
      icon: '✅',
      title: 'Pipeline Healthy',
      text: `Risk score at ${riskScore}/100. Test pipeline is performing within acceptable parameters.`,
      priority: 3,
    });
  }

  // 2. Worst performing suite insight
  const worstSuite = [...suites].sort((a, b) => b.failRate - a.failRate)[0];
  if (worstSuite && worstSuite.failRate > 15) {
    insights.push({
      type: 'critical',
      icon: '🔥',
      title: `${worstSuite.name} is the Top Bottleneck`,
      text: `Failure rate of ${worstSuite.failRate}% with ${worstSuite.failed} failures. This suite is dragging down overall pipeline health by an estimated ${Math.round(worstSuite.failRate * 0.4)}%.`,
      priority: 1,
    });
  }

  // 3. Anomaly-based insights
  if (anomalies.failureRateAnomalies.length > 0) {
    const critical = anomalies.failureRateAnomalies.filter(a => a.severity === 'critical');
    if (critical.length > 0) {
      insights.push({
        type: 'critical',
        icon: '📊',
        title: 'Statistical Anomaly Detected',
        text: `${critical[0].message}. This exceeds ${Math.abs(critical[0].zScore).toFixed(1)} standard deviations from the mean — statistically significant.`,
        priority: 1,
      });
    }
  }

  if (anomalies.trendShifts.length > 0) {
    const spikes = anomalies.trendShifts.filter(s => s.type === 'spike');
    if (spikes.length > 0) {
      insights.push({
        type: 'warning',
        icon: '📈',
        title: 'Trend Shift Detected (EWMA)',
        text: `${spikes[0].message}. The exponentially weighted moving average algorithm detected this as a significant shift pattern.`,
        priority: 2,
      });
    }
  }

  // 4. Prediction-based insights
  if (predictions.predictions) {
    const worsening = predictions.predictions.filter(p => p.direction === 'worsening');
    if (worsening.length > 0) {
      insights.push({
        type: 'warning',
        icon: '🔮',
        title: `${worsening.length} Suite${worsening.length > 1 ? 's' : ''} Predicted to Worsen`,
        text: `Linear regression forecasts: ${worsening.map(w => `${w.suite} (→ ${w.predictedFailRate}%)`).join(', ')}. Confidence: ${worsening[0].confidence.label}.`,
        priority: 2,
      });
    }

    const improving = predictions.predictions.filter(p => p.direction === 'improving');
    if (improving.length > 0) {
      insights.push({
        type: 'success',
        icon: '📉',
        title: `${improving.length} Suite${improving.length > 1 ? 's' : ''} Trending Positively`,
        text: `${improving.map(w => `${w.suite} (→ ${w.predictedFailRate}%)`).join(', ')} showing improvement trajectory.`,
        priority: 3,
      });
    }
  }

  // 5. Correlation insights
  correlations.forEach(c => {
    insights.push({
      type: 'warning',
      icon: '🔗',
      title: 'Cross-Suite Correlation Found',
      text: c.message,
      priority: 2,
    });
  });

  // 6. Flaky test insights
  const totalFlaky = suites.reduce((s, x) => s + x.flaky, 0);
  if (totalFlaky > 3) {
    const worstFlaky = suites.filter(s => s.flaky > 0).sort((a, b) => b.flaky - a.flaky);
    insights.push({
      type: 'warning',
      icon: '🎲',
      title: `${totalFlaky} Flaky Tests Eroding CI Trust`,
      text: `Estimated ${totalFlaky * 2} unnecessary reruns/week. Worst offender: ${worstFlaky[0]?.name} (${worstFlaky[0]?.flaky} flaky). Fixing flaky tests is the highest-ROI action.`,
      priority: 2,
    });
  }

  // 7. Execution time insight
  const slowSuites = suites.filter(s => s.avgTime > 5);
  if (slowSuites.length > 0) {
    insights.push({
      type: 'info',
      icon: '⏱️',
      title: `${slowSuites.length} Slow Suite${slowSuites.length > 1 ? 's' : ''} Blocking CI Velocity`,
      text: `${slowSuites.map(s => `${s.name} (${s.avgTime} min)`).join(', ')} exceed the 5-minute target. Consider parallelization or test splitting.`,
      priority: 3,
    });
  }

  // Sort by priority
  insights.sort((a, b) => a.priority - b.priority);

  return insights;
}

/**
 * Generate the complete AI analysis.
 * @param {Array} suites - Test suite data.
 * @param {Object} anomalies - From anomalyDetector.
 * @param {Object} predictions - From predictiveEngine.
 * @returns {Object} Full AI insights result.
 */
export function generateInsights(suites, anomalies, predictions) {
  const correlations = findCorrelations(suites);
  const riskScore = calculatePipelineRisk(suites, anomalies, predictions);
  const insights = generateNLInsights(suites, anomalies, predictions, correlations, riskScore);

  return {
    insights,
    correlations,
    riskScore,
    riskLevel: riskScore >= 70 ? 'critical' : riskScore >= 40 ? 'warning' : 'healthy',
    timestamp: new Date().toISOString(),
    modelInfo: {
      anomalyMethods: ['Z-Score', 'IQR', 'EWMA'],
      predictionMethods: ['Linear Regression', 'EWMA Forecast'],
      correlationMethod: 'Pearson',
    },
  };
}
