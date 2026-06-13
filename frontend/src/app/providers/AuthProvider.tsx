import {type PropsWithChildren } from 'react';

import { MsalProvider } from '@azure/msal-react';

import { msalInstance } from '@/shared/lib/msal';

const AuthProvider = ({
  children,
}: PropsWithChildren) => {
  return (
    <MsalProvider instance={msalInstance}>
      {children}
    </MsalProvider>
  );
};

export default AuthProvider;