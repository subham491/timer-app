import { screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';

import { renderWithProviders } from '@/tests/utils/renderWithProviders';
import TimerDisplay from './TimerDisplay';

describe('TimerDisplay', () => {
  // ── idle state ──────────────────────────────────────────────────────────────

  describe('idle state', () => {
    it('renders the "Ready to start" status chip', () => {
      renderWithProviders(
        <TimerDisplay
          isRunning={false}
          isPaused={false}
          totalSeconds={0}
        />
      );

      expect(screen.getByText('Ready to start')).toBeInTheDocument();
    });

    it('shows "One clear session at a time." hint text', () => {
      renderWithProviders(
        <TimerDisplay isRunning={false} isPaused={false} totalSeconds={0} />
      );

      expect(screen.getByText(/one clear session at a time/i)).toBeInTheDocument();
    });

    it('does not show project/task cards when idle', () => {
      renderWithProviders(
        <TimerDisplay
          isRunning={false}
          isPaused={false}
          totalSeconds={0}
          project="Internal Operations"
          task="Standup and coordination"
        />
      );

      expect(screen.queryByText('Project')).not.toBeInTheDocument();
      expect(screen.queryByText('Task')).not.toBeInTheDocument();
    });

    it('formats 00:00:00 when totalSeconds is zero', () => {
      renderWithProviders(
        <TimerDisplay isRunning={false} isPaused={false} totalSeconds={0} />
      );

      expect(screen.getByText(/00 : 00 : 00/)).toBeInTheDocument();
    });
  });

  // ── running state ───────────────────────────────────────────────────────────

  describe('running state', () => {
    it('renders the "In focus" status chip', () => {
      renderWithProviders(
        <TimerDisplay isRunning={true} isPaused={false} totalSeconds={120} />
      );

      expect(screen.getByText('In focus')).toBeInTheDocument();
    });

    it('shows project and task cards when running with project+task provided', () => {
      renderWithProviders(
        <TimerDisplay
          isRunning={true}
          isPaused={false}
          totalSeconds={300}
          project="Security Hardening"
          task="Audit remediation"
        />
      );

      expect(screen.getByText('Project')).toBeInTheDocument();
      expect(screen.getByText('Security Hardening')).toBeInTheDocument();
      expect(screen.getByText('Task')).toBeInTheDocument();
      expect(screen.getByText('Audit remediation')).toBeInTheDocument();
    });

    it('shows "Stay in the flow." hint when running without project/task', () => {
      renderWithProviders(
        <TimerDisplay isRunning={true} isPaused={false} totalSeconds={60} />
      );

      expect(screen.getByText(/stay in the flow/i)).toBeInTheDocument();
    });

    it('formats the elapsed time correctly', () => {
      renderWithProviders(
        <TimerDisplay isRunning={true} isPaused={false} totalSeconds={3661} />
      );

      // 1h 1m 1s → "01 : 01 : 01"
      expect(screen.getByText(/01 : 01 : 01/)).toBeInTheDocument();
    });
  });

  // ── paused state ────────────────────────────────────────────────────────────

  describe('paused state', () => {
    it('renders the "Paused" status chip', () => {
      renderWithProviders(
        <TimerDisplay isRunning={false} isPaused={true} totalSeconds={1800} />
      );

      expect(screen.getByText('Paused')).toBeInTheDocument();
    });

    it('shows "Take a breath. Resume when ready." hint when paused without project/task', () => {
      renderWithProviders(
        <TimerDisplay isRunning={false} isPaused={true} totalSeconds={900} />
      );

      expect(screen.getByText(/take a breath/i)).toBeInTheDocument();
    });

    it('shows project and task cards when paused with project+task provided', () => {
      renderWithProviders(
        <TimerDisplay
          isRunning={false}
          isPaused={true}
          totalSeconds={900}
          project="Pulse Mobile Revamp"
          task="Sprint planning"
        />
      );

      expect(screen.getByText('Pulse Mobile Revamp')).toBeInTheDocument();
      expect(screen.getByText('Sprint planning')).toBeInTheDocument();
    });

    it('formats the paused duration correctly', () => {
      renderWithProviders(
        <TimerDisplay isRunning={false} isPaused={true} totalSeconds={5400} />
      );

      // 1h 30m → "01 : 30 : 00"
      expect(screen.getByText(/01 : 30 : 00/)).toBeInTheDocument();
    });
  });
});