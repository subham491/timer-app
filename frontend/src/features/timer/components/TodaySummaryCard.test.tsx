import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';

import { makeStoppedEntry, makeRunningEntry } from '@/tests/fixtures/timerFixtures';
import { renderWithProviders } from '@/tests/utils/renderWithProviders';
import TodaySummaryCard from './TodaySummaryCard';
import TimerLogRow from './TimerLogRow';

// ─── TodaySummaryCard ─────────────────────────────────────────────────────────

describe('TodaySummaryCard', () => {
  it('renders the "Today" heading', () => {
    renderWithProviders(
      <TodaySummaryCard
        lastSessionDurationSeconds={5400}
        sessionCount={3}
        weekTotalSeconds={18000}
      />
    );

    expect(screen.getByText('Today')).toBeInTheDocument();
  });

  it('shows the session count', () => {
    renderWithProviders(
      <TodaySummaryCard
        lastSessionDurationSeconds={5400}
        sessionCount={2}
        weekTotalSeconds={10800}
      />
    );

    expect(screen.getByText('Sessions today')).toBeInTheDocument();
    expect(screen.getByText('2')).toBeInTheDocument();
  });

  it('shows formatted weekly total duration in compact form', () => {
    renderWithProviders(
      <TodaySummaryCard
        lastSessionDurationSeconds={5400}
        sessionCount={5}
        weekTotalSeconds={14400}
      />
    );

    expect(screen.getByText('This week')).toBeInTheDocument();
    expect(screen.getByText('4h 00m')).toBeInTheDocument();
  });

  it('shows last session duration in compact form', () => {
    renderWithProviders(
      <TodaySummaryCard
        lastSessionDurationSeconds={2100}
        sessionCount={1}
        weekTotalSeconds={7200}
      />
    );

    expect(screen.getByText('Last session')).toBeInTheDocument();
    expect(screen.getByText('35m')).toBeInTheDocument();
  });

  it('shows 0m when weekly duration is zero', () => {
    renderWithProviders(
      <TodaySummaryCard
        lastSessionDurationSeconds={0}
        sessionCount={0}
        weekTotalSeconds={0}
      />
    );

    expect(screen.getByText('0m')).toBeInTheDocument();
  });

  it('shows fallback text when there is no last session', () => {
    renderWithProviders(
      <TodaySummaryCard
        lastSessionDurationSeconds={null}
        sessionCount={1}
        weekTotalSeconds={7200}
      />
    );

    expect(screen.getByText('No sessions yet')).toBeInTheDocument();
  });

  it('shows "No sessions yet" when the last session duration is zero', () => {
    renderWithProviders(
      <TodaySummaryCard
        lastSessionDurationSeconds={0}
        sessionCount={0}
        weekTotalSeconds={0}
      />
    );

    expect(screen.getByText('No sessions yet')).toBeInTheDocument();
  });

  it('renders all three metric rows', () => {
    renderWithProviders(
      <TodaySummaryCard
        lastSessionDurationSeconds={3600}
        sessionCount={1}
        weekTotalSeconds={7200}
      />
    );

    expect(screen.getByText('Sessions today')).toBeInTheDocument();
    expect(screen.getByText('This week')).toBeInTheDocument();
    expect(screen.getByText('Last session')).toBeInTheDocument();
  });
});

// ─── TimerLogRow ──────────────────────────────────────────────────────────────

describe('TimerLogRow', () => {
  const renderRow = (
    entry = makeStoppedEntry(),
    activeEntryId: string | null = null
  ) =>
    renderWithProviders(
      <TimerLogRow
        entry={entry}
        activeEntryId={activeEntryId}
        onEdit={vi.fn()}
        onResume={vi.fn()}
      />
    );

  // ── content rendering ─────────────────────────────────────────────────────

  it('renders the entry description', () => {
    renderRow(makeStoppedEntry({ description: 'Sprint review meeting' }));
    expect(screen.getByText('Sprint review meeting')).toBeInTheDocument();
  });

  it('renders the entry project and task', () => {
    renderRow(
      makeStoppedEntry({
        project: 'Security Hardening',
        task: 'Audit remediation',
      })
    );

    expect(screen.getByText('Security Hardening')).toBeInTheDocument();
    expect(screen.getByText('Audit remediation')).toBeInTheDocument();
  });

  it('shows a "Billable" chip for billable entries', () => {
    renderRow(makeStoppedEntry({ billable: true }));
    expect(screen.getByText('Billable')).toBeInTheDocument();
  });

  it('shows an "Internal" chip for non-billable entries', () => {
    renderRow(makeStoppedEntry({ billable: false }));
    expect(screen.getByText('Internal')).toBeInTheDocument();
  });

  it('shows "Running" chip for active entries', () => {
    renderRow(makeRunningEntry({ id: 'running-1' }));
    expect(screen.getByText('Running')).toBeInTheDocument();
  });

  it('displays the formatted duration', () => {
    renderRow(makeStoppedEntry({ durationSeconds: 3600 }));
    expect(screen.getByText('01:00:00')).toBeInTheDocument();
  });

  it('shows the time range', () => {
    renderRow(
      makeStoppedEntry({ startTime: '09:00', endTime: '10:00', startDate: '2026-06-09', endDate: '2026-06-09' })
    );
    expect(screen.getByText(/09:00/)).toBeInTheDocument();
    expect(screen.getByText(/10:00/)).toBeInTheDocument();
  });

  it('shows "Now" in range when endTime is null (running entry)', () => {
    renderRow(makeRunningEntry({ endTime: null, endDate: null }));
    expect(screen.getByText(/Now/)).toBeInTheDocument();
  });

  // ── button states ────────────────────────────────────────────────────────

  it('enables both Resume and Edit buttons for a stopped entry with no active timer', () => {
    renderRow(makeStoppedEntry({ id: 'entry-1' }), null);

    expect(screen.getByRole('button', { name: /resume/i })).not.toBeDisabled();
    expect(screen.getByRole('button', { name: /edit/i })).not.toBeDisabled();
  });

  it('disables Resume when another timer is already active', () => {
    renderRow(makeStoppedEntry({ id: 'entry-1' }), 'other-entry');

    expect(screen.getByRole('button', { name: /resume/i })).toBeDisabled();
  });

  it('disables Resume when the entry itself is running', () => {
    const running = makeRunningEntry({ id: 'running-1' });
    renderRow(running, 'running-1');

    expect(screen.getByRole('button', { name: /resume/i })).toBeDisabled();
  });

  it('disables Edit when the entry is running', () => {
    const running = makeRunningEntry({ id: 'running-1' });
    renderRow(running, 'running-1');

    expect(screen.getByRole('button', { name: /edit/i })).toBeDisabled();
  });

  // ── callbacks ─────────────────────────────────────────────────────────────

  it('calls onResume with the entry id when Resume is clicked', async () => {
    const onResume = vi.fn();
    const entry = makeStoppedEntry({ id: 'entry-42' });
    renderWithProviders(
      <TimerLogRow
        entry={entry}
        activeEntryId={null}
        onEdit={vi.fn()}
        onResume={onResume}
      />
    );

    await userEvent.click(screen.getByRole('button', { name: /resume/i }));

    expect(onResume).toHaveBeenCalledWith('entry-42');
  });

  it('calls onEdit with the entry id when Edit is clicked', async () => {
    const onEdit = vi.fn();
    const entry = makeStoppedEntry({ id: 'entry-99' });
    renderWithProviders(
      <TimerLogRow
        entry={entry}
        activeEntryId={null}
        onEdit={onEdit}
        onResume={vi.fn()}
      />
    );

    await userEvent.click(screen.getByRole('button', { name: /edit/i }));

    expect(onEdit).toHaveBeenCalledWith('entry-99');
  });
});
