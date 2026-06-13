import { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';

import MicrosoftIcon from '@mui/icons-material/Microsoft';
import { alpha, useTheme } from '@mui/material/styles';
import { Box, Button, CircularProgress, Paper, Stack, Typography } from '@mui/material';

import { useAppSelector } from '@/store/hooks';
import { selectAuthUser } from '@/store/slices/auth/authSelectors';
import { fetchAuthMode, startDevLogin, startLogin } from '@/features/auth/api/auth.api';

const MicrosoftLogo = ({ size = 18 }: { size?: number }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 21 21"
    xmlns="http://www.w3.org/2000/svg"
    aria-hidden
    focusable="false"
  >
    <rect x="1" y="1" width="9" height="9" fill="#F25022" />
    <rect x="11" y="1" width="9" height="9" fill="#7FBA00" />
    <rect x="1" y="11" width="9" height="9" fill="#00A4EF" />
    <rect x="11" y="11" width="9" height="9" fill="#FFB900" />
  </svg>
);

const LoginPage = () => {
  const theme = useTheme();
  const authUser = useAppSelector(selectAuthUser);
  const [devLogin, setDevLogin] = useState<boolean | null>(null); // null = still checking

  useEffect(() => {
    if (authUser) return;
    let active = true;
    fetchAuthMode().then((mode) => {
      if (!active) return;
      if (mode.devLogin) {
        startDevLogin(); // dev → straight to dashboard
      } else {
        setDevLogin(false); // real → render the sign-in card
      }
    });
    return () => {
      active = false;
    };
  }, [authUser]);

  if (authUser) return <Navigate to="/dashboard" replace />;

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'grid',
        placeItems: 'center',
        px: 2,
        position: 'relative',
        overflow: 'hidden',
        bgcolor: theme.palette.mode === 'light' ? '#eef4fb' : '#020617',
      }}
    >
      {/* Brand gradient wash echoing the dashboard sidebar */}
      <Box
        aria-hidden
        sx={{
          position: 'absolute',
          inset: 0,
          background:
            theme.palette.mode === 'light'
              ? `radial-gradient(1100px 520px at 50% -10%, ${alpha('#0f5bac', 0.14)} 0%, transparent 60%)`
              : `radial-gradient(1100px 520px at 50% -10%, ${alpha('#0f5bac', 0.32)} 0%, transparent 60%)`,
          pointerEvents: 'none',
        }}
      />

      <Paper
        elevation={0}
        sx={{
          position: 'relative',
          width: '100%',
          maxWidth: 412,
          borderRadius: 3,
          px: { xs: 3, sm: 4.5 },
          py: { xs: 4, sm: 5 },
          backgroundColor: alpha(theme.palette.background.paper, 0.96),
          border: `1px solid ${alpha(theme.palette.divider, 0.4)}`,
          boxShadow: `0 18px 48px ${alpha(theme.palette.common.black, 0.1)}`,
          backdropFilter: 'blur(12px)',
        }}
      >
        <Stack spacing={3} sx={{ alignItems: 'center', textAlign: 'center' }}>
          {/* Logo */}
          <Box
            sx={{
              width: '100%',
              display: 'grid',
              placeItems: 'center',
              p: 1.5,
              borderRadius: 2.5,
              background: 'linear-gradient(180deg, #0f5bac 0%, #0a4d94 100%)',
              boxShadow: `0 10px 24px ${alpha('#0a4d94', 0.35)}`,
            }}
          >
            <Box
              component="img"
              src="/soliton_logo.jpg"
              alt="Soliton"
              sx={{ maxWidth: 148, height: 'auto', objectFit: 'contain' }}
            />
          </Box>

          <Stack spacing={0.75} sx={{ alignItems: 'center' }}>
            <Typography
              sx={{ fontSize: '1.35rem', fontWeight: 700, letterSpacing: '-0.02em' }}
            >
              Welcome back
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 300 }}>
              Sign in with your Soliton account to access the time tracker.
            </Typography>
          </Stack>

          {devLogin === false ? (
            <Button
              fullWidth
              variant="contained"
              size="large"
              startIcon={<MicrosoftLogo />}
              onClick={startLogin}
              sx={{
                borderRadius: 1.75,
                py: 1.15,
                fontWeight: 600,
                textTransform: 'none',
                fontSize: '0.98rem',
                boxShadow: 'none',
                background: 'linear-gradient(180deg, #1f6fd0 0%, #0f5bac 100%)',
                '&:hover': {
                  boxShadow: `0 8px 20px ${alpha('#0f5bac', 0.3)}`,
                  background: 'linear-gradient(180deg, #1c66bf 0%, #0d5299 100%)',
                },
              }}
            >
              Sign in with Microsoft
            </Button>
          ) : (
            // Still checking mode, or dev mode redirecting out
            <Stack spacing={1.5} sx={{ py: 1.5, alignItems: 'center' }}>
              <CircularProgress size={26} thickness={4} />
              <Typography variant="caption" color="text.secondary">
                Signing you in…
              </Typography>
            </Stack>
          )}

          <Typography variant="caption" color="text.secondary" sx={{ opacity: 0.75 }}>
            Protected by Microsoft single sign-on
          </Typography>
        </Stack>
      </Paper>
    </Box>
  );
};

export default LoginPage;