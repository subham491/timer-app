import AppProviders from '@/app/providers/AppProviders';

import AppRouter from '@/app/router/AppRouter';

const App = () => {
  return (
    <AppProviders>
      <AppRouter />
    </AppProviders>
  );
};

export default App;