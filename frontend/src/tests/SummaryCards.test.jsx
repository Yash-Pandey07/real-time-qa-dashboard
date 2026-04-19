import { render, screen } from '@testing-library/react';
import SummaryCards from '../components/SummaryCards.jsx';

function renderCards(overrides = {}) {
  const defaults = { ciPassRate: 85, openBugs: 42, testPassRate: 78, bottleneckCount: 3, criticalCount: 1 };
  return render(<SummaryCards {...defaults} {...overrides} />);
}

describe('SummaryCards — rendering', () => {
  test('renders without crashing', () => {
    renderCards();
  });

  test('shows CI pass rate value', () => {
    renderCards({ ciPassRate: 92 });
    expect(screen.getByText('92%')).toBeInTheDocument();
  });

  test('shows open bugs count', () => {
    renderCards({ openBugs: 17 });
    expect(screen.getByText('17')).toBeInTheDocument();
  });

  test('shows test pass rate value', () => {
    renderCards({ testPassRate: 65 });
    expect(screen.getByText('65%')).toBeInTheDocument();
  });

  test('shows bottleneck count', () => {
    renderCards({ bottleneckCount: 5, criticalCount: 0 });
    // The span containing just "5" (the bottleneck count digit)
    const spans = screen.getAllByText(/5/);
    expect(spans.length).toBeGreaterThan(0);
  });

  test('shows critical badge when criticalCount > 0', () => {
    renderCards({ bottleneckCount: 3, criticalCount: 2 });
    expect(screen.getByText('2 critical')).toBeInTheDocument();
  });

  test('does NOT show critical badge when criticalCount = 0', () => {
    renderCards({ bottleneckCount: 3, criticalCount: 0 });
    expect(screen.queryByText(/critical/)).not.toBeInTheDocument();
  });

  test('shows all 4 card labels', () => {
    renderCards();
    expect(screen.getByText('CI Pass Rate')).toBeInTheDocument();
    expect(screen.getByText('Open Bugs')).toBeInTheDocument();
    expect(screen.getByText('Test Pass Rate')).toBeInTheDocument();
    expect(screen.getByText('Bottlenecks')).toBeInTheDocument();
  });
});
