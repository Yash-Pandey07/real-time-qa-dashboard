import { render, screen, fireEvent } from '@testing-library/react';
import Bottlenecks from '../components/Bottlenecks.jsx';

const mockBottlenecks = [
  {
    id: 'b1', type: 'ci_failure_rate', severity: 'critical',
    title: 'High CI failure rate — facebook/react',
    description: '4 of 5 pipeline runs failed.',
    recommendation: 'Check the failed run logs.',
    metric: '80% failure rate (4/5)',
    module: 'facebook/react',
    detectedAt: new Date().toISOString(),
  },
  {
    id: 'b2', type: 'bug_concentration', severity: 'high',
    title: 'Bug cluster in Auth Module',
    description: '8 open bugs concentrated in Auth Module.',
    recommendation: 'Schedule a bug-bash session.',
    metric: '8 open bugs',
    module: 'Auth Module',
    detectedAt: new Date().toISOString(),
  },
  {
    id: 'b3', type: 'wip_pileup', severity: 'medium',
    title: 'WIP pile-up — 15 tickets In Progress',
    description: 'Over 50% of tracked issues are In Progress.',
    recommendation: 'Apply a WIP limit.',
    metric: '15 In Progress',
    module: 'Process',
    detectedAt: new Date().toISOString(),
  },
];

describe('Bottlenecks — rendering', () => {
  test('shows "No bottlenecks detected" when empty', () => {
    render(<Bottlenecks bottlenecks={[]} onNavigate={() => {}} />);
    expect(screen.getByText(/No bottlenecks detected/i)).toBeInTheDocument();
  });

  test('renders all bottleneck titles', () => {
    render(<Bottlenecks bottlenecks={mockBottlenecks} onNavigate={() => {}} />);
    expect(screen.getByText('High CI failure rate — facebook/react')).toBeInTheDocument();
    expect(screen.getByText('Bug cluster in Auth Module')).toBeInTheDocument();
    expect(screen.getByText('WIP pile-up — 15 tickets In Progress')).toBeInTheDocument();
  });

  test('shows severity badges', () => {
    render(<Bottlenecks bottlenecks={mockBottlenecks} onNavigate={() => {}} />);
    expect(screen.getByText('critical')).toBeInTheDocument();
    expect(screen.getByText('high')).toBeInTheDocument();
    expect(screen.getByText('medium')).toBeInTheDocument();
  });

  test('shows source badge (GitHub Actions) for CI type', () => {
    render(<Bottlenecks bottlenecks={[mockBottlenecks[0]]} onNavigate={() => {}} />);
    expect(screen.getByText('GitHub Actions')).toBeInTheDocument();
  });

  test('shows source badge (Jira) for bug_concentration type', () => {
    render(<Bottlenecks bottlenecks={[mockBottlenecks[1]]} onNavigate={() => {}} />);
    expect(screen.getByText('Jira')).toBeInTheDocument();
  });

  test('expands description when "Show details" is clicked', () => {
    render(<Bottlenecks bottlenecks={[mockBottlenecks[0]]} onNavigate={() => {}} />);
    fireEvent.click(screen.getByText('Show details'));
    expect(screen.getByText('4 of 5 pipeline runs failed.')).toBeInTheDocument();
  });

  test('calls onNavigate when source badge is clicked', () => {
    const onNavigate = vi.fn();
    render(<Bottlenecks bottlenecks={[mockBottlenecks[0]]} onNavigate={onNavigate} />);
    // Source badge (GitHub Actions button) is always visible — click it directly
    fireEvent.click(screen.getByText('GitHub Actions'));
    expect(onNavigate).toHaveBeenCalledWith('pipeline');
  });

  test('shows total count in section header', () => {
    render(<Bottlenecks bottlenecks={mockBottlenecks} onNavigate={() => {}} />);
    const matches = screen.getAllByText(/3/);
    expect(matches.length).toBeGreaterThan(0);
  });
});
