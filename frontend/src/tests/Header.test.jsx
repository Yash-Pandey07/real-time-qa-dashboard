import { render, screen, fireEvent } from '@testing-library/react';
import Header from '../components/Header.jsx';

describe('Header — rendering', () => {
  test('shows the dashboard title', () => {
    render(<Header connected={true} lastUpdated={null} onRefresh={() => {}} />);
    expect(screen.getByText('QA Intelligence Dashboard')).toBeInTheDocument();
  });

  test('shows LIVE badge when connected=true', () => {
    render(<Header connected={true} lastUpdated={null} onRefresh={() => {}} />);
    expect(screen.getByText('● LIVE')).toBeInTheDocument();
  });

  test('shows RECONNECTING badge when connected=false', () => {
    render(<Header connected={false} lastUpdated={null} onRefresh={() => {}} />);
    expect(screen.getByText('● RECONNECTING')).toBeInTheDocument();
  });

  test('does NOT show LIVE badge when disconnected', () => {
    render(<Header connected={false} lastUpdated={null} onRefresh={() => {}} />);
    expect(screen.queryByText('● LIVE')).not.toBeInTheDocument();
  });

  test('calls onRefresh when Refresh button is clicked', () => {
    const onRefresh = vi.fn();
    render(<Header connected={true} lastUpdated={null} onRefresh={onRefresh} />);
    fireEvent.click(screen.getByText('Refresh'));
    expect(onRefresh).toHaveBeenCalledTimes(1);
  });

  test('shows "Updated:" label', () => {
    render(<Header connected={true} lastUpdated={null} onRefresh={() => {}} />);
    expect(screen.getByText(/Updated:/)).toBeInTheDocument();
  });
});
