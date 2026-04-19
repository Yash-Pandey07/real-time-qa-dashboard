import { render, screen } from '@testing-library/react';
import HeatMap from '../components/HeatMap.jsx';

const mockGrid = [
  {
    module: 'facebook/react',
    slots: [
      { runId: '1', status: 'success', branch: 'main', startedAt: new Date().toISOString(), durationSec: 120 },
      { runId: '2', status: 'failure', branch: 'fix/bug', startedAt: new Date().toISOString(), durationSec: 90 },
    ],
    total: 2, pass: 1, fail: 1, passRate: 50, avgDuration: 105, trend: 'stable',
    workflowCounts: { 'CI': 2 }, recentFailures: [],
  },
  {
    module: 'vercel/next.js',
    slots: [
      { runId: '3', status: 'success', branch: 'main', startedAt: new Date().toISOString(), durationSec: 200 },
    ],
    total: 1, pass: 1, fail: 0, passRate: 100, avgDuration: 200, trend: 'improving',
    workflowCounts: { 'Build': 1 }, recentFailures: [],
  },
];

describe('HeatMap — rendering', () => {
  test('renders without crashing with empty grid', () => {
    render(<HeatMap grid={[]} />);
  });

  test('shows repository names', () => {
    render(<HeatMap grid={mockGrid} />);
    expect(screen.getByText('facebook/react')).toBeInTheDocument();
    expect(screen.getByText('vercel/next.js')).toBeInTheDocument();
  });

  test('shows pass rate for each repo', () => {
    render(<HeatMap grid={mockGrid} />);
    expect(screen.getByText('50%')).toBeInTheDocument();
    expect(screen.getByText('100%')).toBeInTheDocument();
  });

  test('shows trend indicator', () => {
    render(<HeatMap grid={mockGrid} />);
    const matches = screen.getAllByText(/Improving/i);
    expect(matches.length).toBeGreaterThan(0);
  });

  test('shows summary bar with total runs count', () => {
    render(<HeatMap grid={mockGrid} />);
    const matches = screen.getAllByText(/3/);
    expect(matches.length).toBeGreaterThan(0);
  });
});
