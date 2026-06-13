import { configureStore } from '@reduxjs/toolkit';
import { ThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { render, type RenderOptions } from '@testing-library/react';
import type { ReactNode } from 'react';
import { Provider } from 'react-redux';
import { MemoryRouter } from 'react-router-dom';

import { getTheme } from '@/app/theme';
import rootReducer from '@/store/rootReducer';
import type { RootState } from '@/store/store';

/**
 * Creates a fresh store for every test so state never leaks between cases.
 * Pass `preloadedState` to seed specific slice state.
 */
export const createTestStore = (preloadedState?: Partial<RootState>) =>
  configureStore({
    reducer: rootReducer,
    preloadedState,
  });

interface WrapperOptions extends RenderOptions {
  preloadedState?: Partial<RootState>;
  initialPath?: string;
}

/**
 * Drop-in replacement for RTL `render` that wraps the tree with:
 *  - Redux Provider (fresh store)
 *  - MUI ThemeProvider (light theme)
 *  - MemoryRouter (so any Link / useNavigate calls don't crash)
 */
export const renderWithProviders = (
  ui: ReactNode,
  { preloadedState, initialPath = '/', ...renderOptions }: WrapperOptions = {}
) => {
  const store = createTestStore(preloadedState);

  const Wrapper = ({ children }: { children: ReactNode }) => (
    <Provider store={store}>
      <ThemeProvider theme={getTheme('light')}>
        <CssBaseline />
        <MemoryRouter initialEntries={[initialPath]}>{children}</MemoryRouter>
      </ThemeProvider>
    </Provider>
  );

  return {
    store,
    ...render(ui, { wrapper: Wrapper, ...renderOptions }),
  };
};