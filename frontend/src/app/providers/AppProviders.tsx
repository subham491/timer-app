import {type PropsWithChildren } from 'react';

import { Provider } from 'react-redux';

import { BrowserRouter } from 'react-router-dom';

import { QueryClientProvider } from '@tanstack/react-query';

import { queryClient } from '@/shared/api/queryClient';

import { store } from '@/store/store';

import ThemeProvider from './ThemeProvider';

import AuthProvider from './AuthProvider';

const AppProviders = ({
  children,
}: PropsWithChildren) => {
  return (
    <QueryClientProvider client={queryClient}>
      <Provider store={store}>
        <AuthProvider>
          <ThemeProvider>
            <BrowserRouter>
              {children}
            </BrowserRouter>
          </ThemeProvider>
        </AuthProvider>
      </Provider>
    </QueryClientProvider>
  );
};

export default AppProviders;