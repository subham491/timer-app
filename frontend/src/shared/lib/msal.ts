import { PublicClientApplication } from '@azure/msal-browser';

export const msalInstance =
  new PublicClientApplication({
    auth: {
      clientId: 'YOUR_CLIENT_ID',
      authority:
        'https://login.microsoftonline.com/common',

      redirectUri: 'http://localhost:5173',
    },
  });