import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import LoginPage from '@/features/auth/pages/LoginPage';
import { renderWithProviders } from '@/tests/utils/renderWithProviders';

describe('LoginPage', () => {
  beforeEach(() => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          access_token: 'backend-dev-token',
          token_type: 'bearer',
          user: {
            user_id: 42,
            email: 'aswath@soliton.com',
            display_name: 'Aswath Ravi',
            role: 'administrator',
          },
        }),
      })
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('renders the Login heading', () => {
    renderWithProviders(<LoginPage />);
    expect(screen.getByRole('heading', { name: /login/i })).toBeInTheDocument();
  });

  it('renders Email and Password fields', () => {
    renderWithProviders(<LoginPage />);
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
  });

  it('renders the Login submit button', () => {
    renderWithProviders(<LoginPage />);
    expect(screen.getByRole('button', { name: /login/i })).toBeInTheDocument();
  });

  it('shows an email error for an invalid email address', async () => {
    renderWithProviders(<LoginPage />);

    await userEvent.type(screen.getByLabelText(/email/i), 'not-an-email');
    await userEvent.type(screen.getByLabelText(/password/i), 'password123');
    await userEvent.click(screen.getByRole('button', { name: /login/i }));

    await waitFor(() => {
      expect(screen.getByText(/invalid email/i)).toBeInTheDocument();
    });
  });

  it('shows a password error when password is too short', async () => {
    renderWithProviders(<LoginPage />);

    await userEvent.type(screen.getByLabelText(/email/i), 'user@example.com');
    await userEvent.type(screen.getByLabelText(/password/i), '123');
    await userEvent.click(screen.getByRole('button', { name: /login/i }));

    await waitFor(() => {
      expect(screen.getByText(/at least 6/i)).toBeInTheDocument();
    });
  });

  it('stores the backend access token and user details in Redux', async () => {
    const { store } = renderWithProviders(<LoginPage />, {
      initialPath: '/login',
    });

    await userEvent.type(screen.getByLabelText(/email/i), 'aswath@soliton.com');
    await userEvent.type(screen.getByLabelText(/password/i), 'password123');
    await userEvent.click(screen.getByRole('button', { name: /login/i }));

    await waitFor(() => {
      const auth = store.getState().auth;
      expect(auth.isAuthenticated).toBe(true);
      expect(auth.token).toBe('backend-dev-token');
      expect(auth.user).toEqual({
        id: '42',
        name: 'Aswath Ravi',
        email: 'aswath@soliton.com',
        role: 'administrator',
      });
    });
  });

  it('shows the backend error when dev-login fails', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: false,
        json: async () => ({
          detail: 'Development auth endpoint is not available.',
        }),
      })
    );

    const { store } = renderWithProviders(<LoginPage />);

    await userEvent.type(screen.getByLabelText(/email/i), 'user@example.com');
    await userEvent.type(screen.getByLabelText(/password/i), 'password123');
    await userEvent.click(screen.getByRole('button', { name: /login/i }));

    await waitFor(() => {
      expect(
        screen.getByText(/development auth endpoint is not available/i)
      ).toBeInTheDocument();
    });

    expect(store.getState().auth.isAuthenticated).toBe(false);
  });
});
