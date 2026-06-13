import { screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';

import { renderWithProviders } from '@/tests/utils/renderWithProviders';
import RouteGuard from '@/app/router/ProtectedRoute';

describe('ProtectedRoute', () => {
  it('redirects to /login when the user is not authenticated', () => {
    renderWithProviders(
      <RouteGuard>
        <div>Secret content</div>
      </RouteGuard>,
      {
        preloadedState: {
          auth: { isAuthenticated: false, token: null, user: null },
        },
      }
    );

    expect(screen.queryByText('Secret content')).not.toBeInTheDocument();
  });

  it('renders children when the user is authenticated', () => {
    renderWithProviders(
      <RouteGuard>
        <div>Dashboard content</div>
      </RouteGuard>,
      {
        preloadedState: {
          auth: {
            isAuthenticated: true,
            token: 'valid-token',
            user: {
              id: '1',
              name: 'Aswath',
              email: 'aswath@example.com',
              role: 'administrator',
            },
          },
        },
      }
    );

    expect(screen.getByText('Dashboard content')).toBeInTheDocument();
  });

  it('renders nested children correctly when authenticated', () => {
    renderWithProviders(
      <RouteGuard>
        <section>
          <h1>Timer</h1>
          <p>Start tracking</p>
        </section>
      </RouteGuard>,
      {
        preloadedState: {
          auth: {
            isAuthenticated: true,
            token: 'tok',
            user: {
              id: '1',
              name: 'Test',
              email: 'test@test.com',
              role: 'manager',
            },
          },
        },
      }
    );

    expect(screen.getByRole('heading', { name: 'Timer' })).toBeInTheDocument();
    expect(screen.getByText('Start tracking')).toBeInTheDocument();
  });
});
