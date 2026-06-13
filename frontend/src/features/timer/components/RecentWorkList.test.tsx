import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';

import { makeStoppedEntry, makeRunningEntry } from '@/tests/fixtures/timerFixtures';
import { renderWithProviders } from '@/tests/utils/renderWithProviders';
import RecentWorkList from './RecentWorkList';
import type { TimerEntry } from '@/store/slices/timer/timer.types';

// ─── Helpers ─────────────────────────────────────────────────────────────────

const INITIAL_BATCH = 12;

/** Generate n unique stopped entries. */
const makeEntries = (count: number): TimerEntry[] =>
  Array.from({ length: count }, (_, i) =>
    makeStoppedEntry({
      id: `entry-${i + 1}`,
      description: `Task ${i + 1}`,
      durationSeconds: 600 + i * 60,
    })
  );

const renderList = (
  entries: TimerEntry[] = [],
  overrides: {
    onAddManualEntry?: () => void;
    onEditEntry?: (id: string) => void;
  } = {}
) =>
  renderWithProviders(
    <RecentWorkList
      entries={entries}
      onAddManualEntry={overrides.onAddManualEntry ?? vi.fn()}
      onEditEntry={overrides.onEditEntry ?? vi.fn()}
    />
  );

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('RecentWorkList', () => {
  // ── empty state ─────────────────────────────────────────────────────────────

  it('shows "No recent work yet." when entries array is empty', () => {
    renderList([]);
    expect(screen.getByText(/no recent work yet/i)).toBeInTheDocument();
  });

  it('renders the "Recent Work" heading', () => {
    renderList([]);
    expect(screen.getByText('Recent Work')).toBeInTheDocument();
  });

  it('renders the "Manual Entry" button', () => {
    renderList([]);
    expect(screen.getByRole('button', { name: /manual entry/i })).toBeInTheDocument();
  });

  // ── entry rendering ─────────────────────────────────────────────────────────

  it('renders entry task and project names', () => {
    const entry = makeStoppedEntry({
      task: 'Bug fixing',
      project: 'Pulse Mobile Revamp',
    });
    renderList([entry]);

    expect(screen.getByText('Bug fixing')).toBeInTheDocument();
    expect(screen.getByText('Pulse Mobile Revamp')).toBeInTheDocument();
  });

  it('shows "Billable" for billable entries', () => {
    renderList([makeStoppedEntry({ billable: true })]);
    expect(screen.getByText('Billable')).toBeInTheDocument();
  });

  it('shows "Internal" for non-billable entries', () => {
    renderList([makeStoppedEntry({ billable: false })]);
    expect(screen.getByText('Internal')).toBeInTheDocument();
  });

  it('shows the description when present', () => {
    renderList([makeStoppedEntry({ description: 'Finished the auth module' })]);
    expect(screen.getByText('Finished the auth module')).toBeInTheDocument();
  });

  it('renders the formatted duration for each entry', () => {
    renderList([makeStoppedEntry({ durationSeconds: 3600 })]);
    expect(screen.getByText('01:00:00')).toBeInTheDocument();
  });

  it('renders the time range', () => {
    renderList([makeStoppedEntry({ startTime: '09:00', endTime: '10:00' })]);
    expect(screen.getByText('09:00-10:00')).toBeInTheDocument();
  });

  it('shows "Now" for running entries (null endTime)', () => {
    renderList([makeRunningEntry()]);
    expect(screen.getByText(/Now/)).toBeInTheDocument();
  });

  // ── edit button ─────────────────────────────────────────────────────────────

  it('disables the Edit button for running entries', () => {
    renderList([makeRunningEntry()]);
    expect(screen.getByRole('button', { name: /edit/i })).toBeDisabled();
  });

  it('enables the Edit button for stopped entries', () => {
    renderList([makeStoppedEntry()]);
    expect(screen.getByRole('button', { name: /edit/i })).not.toBeDisabled();
  });

  it('calls onEditEntry with the entry id when Edit is clicked', async () => {
    const onEditEntry = vi.fn();
    renderList([makeStoppedEntry({ id: 'entry-77' })], { onEditEntry });

    await userEvent.click(screen.getByRole('button', { name: /edit/i }));

    expect(onEditEntry).toHaveBeenCalledWith('entry-77');
  });

  it('calls onAddManualEntry when "Manual Entry" is clicked', async () => {
    const onAddManualEntry = vi.fn();
    renderList([], { onAddManualEntry });

    await userEvent.click(screen.getByRole('button', { name: /manual entry/i }));

    expect(onAddManualEntry).toHaveBeenCalledTimes(1);
  });

  // ── batch rendering ─────────────────────────────────────────────────────────

  it(`shows only the first ${INITIAL_BATCH} entries initially`, () => {
    const entries = makeEntries(20);
    renderList(entries);

    const editButtons = screen.getAllByRole('button', { name: /edit/i });
    expect(editButtons).toHaveLength(INITIAL_BATCH);
  });

  it(`shows a "Scroll to load more" hint when entries exceed ${INITIAL_BATCH}`, () => {
    renderList(makeEntries(15));
    expect(screen.getByText(/scroll to load more/i)).toBeInTheDocument();
  });

  it('does not show "Scroll to load more" when entries fit within initial batch', () => {
    renderList(makeEntries(5));
    expect(screen.queryByText(/scroll to load more/i)).not.toBeInTheDocument();
  });

  it('shows all entries and no scroll hint when count equals initial batch exactly', () => {
    // At exactly INITIAL_BATCH entries: all visible, no pagination hints shown
    const entries = makeEntries(INITIAL_BATCH);
    renderList(entries);

    const editButtons = screen.getAllByRole('button', { name: /edit/i });
    expect(editButtons).toHaveLength(INITIAL_BATCH);
    expect(screen.queryByText(/scroll to load more/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/showing all/i)).not.toBeInTheDocument();
  });

  it('shows all entries without truncation when count is ≤ initial batch', () => {
    const entries = makeEntries(8);
    renderList(entries);

    const editButtons = screen.getAllByRole('button', { name: /edit/i });
    expect(editButtons).toHaveLength(8);
  });
});