import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';

import { renderWithProviders } from '@/tests/utils/renderWithProviders';
import StopSessionModal from './StopSessionModal';

const baseProps = {
  billable: true,
  durationSeconds: 3600,
  notes: '',
  onBillableChange: vi.fn(),
  onClose: vi.fn(),
  onNotesChange: vi.fn(),
  onSave: vi.fn(),
  project: 'Internal Operations',
  task: 'Standup and coordination',
};

const renderModal = (props: Partial<typeof baseProps> & { open: boolean }) =>
  renderWithProviders(
    <StopSessionModal {...baseProps} {...props} />
  );

describe('StopSessionModal', () => {
  // ── visibility ──────────────────────────────────────────────────────────────

  it('renders nothing visible when open is false', () => {
    renderModal({ open: false });

    expect(screen.queryByText('Complete session')).not.toBeInTheDocument();
  });

  it('renders the dialog content when open is true', () => {
    renderModal({ open: true });

    expect(screen.getByText('Complete session')).toBeInTheDocument();
  });

  // ── content rendering ───────────────────────────────────────────────────────

  it('shows the formatted duration', () => {
    renderModal({ open: true, durationSeconds: 3600 });

    // 1 hour = "01:00:00"
    expect(screen.getByText('01:00:00')).toBeInTheDocument();
  });

  it('shows the project name', () => {
    renderModal({ open: true, project: 'Security Hardening' });

    expect(screen.getByText('Security Hardening')).toBeInTheDocument();
  });

  it('shows the task name', () => {
    renderModal({ open: true, task: 'Audit remediation' });

    expect(screen.getByText('Audit remediation')).toBeInTheDocument();
  });

  it('renders the Notes textarea', () => {
    renderModal({ open: true });

    expect(screen.getByLabelText(/notes/i)).toBeInTheDocument();
  });

  it('shows current notes value in the textarea', () => {
    renderModal({ open: true, notes: 'Reviewed the PR' });

    expect(screen.getByDisplayValue('Reviewed the PR')).toBeInTheDocument();
  });

  it('renders the Billable toggle switch', () => {
    renderModal({ open: true });

    expect(screen.getByRole('checkbox')).toBeInTheDocument();
  });

  // ── callbacks ───────────────────────────────────────────────────────────────

  it('calls onSave when "Save Session" is clicked', async () => {
    const onSave = vi.fn();
    renderModal({ open: true, onSave });

    await userEvent.click(screen.getByRole('button', { name: /save session/i }));

    expect(onSave).toHaveBeenCalledTimes(1);
  });

  it('calls onClose when "Cancel" is clicked', async () => {
    const onClose = vi.fn();
    renderModal({ open: true, onClose });

    await userEvent.click(screen.getByRole('button', { name: /cancel/i }));

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('calls onNotesChange when the user types in the notes field', async () => {
    const onNotesChange = vi.fn();
    renderModal({ open: true, onNotesChange });

    await userEvent.type(screen.getByLabelText(/notes/i), 'Done');

    expect(onNotesChange).toHaveBeenCalled();
    expect(onNotesChange).toHaveBeenLastCalledWith(
      expect.stringContaining('D')
    );
  });

  it('calls onBillableChange when the billable switch is toggled', async () => {
    const onBillableChange = vi.fn();
    renderModal({ open: true, billable: true, onBillableChange });

    await userEvent.click(screen.getByRole('checkbox'));

    expect(onBillableChange).toHaveBeenCalledWith(false);
  });

  it('renders both "Cancel" and "Save Session" buttons', () => {
    renderModal({ open: true });

    expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /save session/i })).toBeInTheDocument();
  });
});