import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';

import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  TextField,
  Typography,
} from '@mui/material';

import { useAppDispatch } from '@/store/hooks';
import { loginSuccess } from '@/store/slices/auth/authSlice';

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

type LoginFormData = z.infer<typeof loginSchema>;

const API_BASE_URL =
  (import.meta.env.VITE_API_BASE_URL as string | undefined)?.replace(/\/$/, '') ??
  'http://localhost:8000/api/v1';

interface LoginResponse {
  access_token: string;
  token_type: 'bearer';
  user: {
    display_name: string;
    email: string;
    role: 'administrator' | 'manager' | 'regularUser' | 'reportViewer';
    user_id: number;
  };
}

const LoginPage = () => {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const [loginError, setLoginError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (data: LoginFormData) => {
    setLoginError(null);
    setIsSubmitting(true);

    try {
      const response = await fetch(`${API_BASE_URL}/auth/login`, {
        body: JSON.stringify({
          email: data.email.trim().toLowerCase(),
          password: data.password,
        }),
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
        },
        method: 'POST',
      });

      if (!response.ok) {
        let detail = 'Login failed.';

        try {
          const errorBody = (await response.json()) as { detail?: string };
          if (errorBody.detail) {
            detail = errorBody.detail;
          }
        } catch {
          // Fall back to the generic message when the response is not JSON.
        }

        throw new Error(detail);
      }

      const payload = (await response.json()) as LoginResponse;

      dispatch(
        loginSuccess({
          token: payload.access_token,
          user: {
            id: String(payload.user.user_id),
            name: payload.user.display_name,
            email: payload.user.email,
            role: payload.user.role,
          },
        })
      );

      navigate('/dashboard');
    } catch (error) {
      setLoginError(
        error instanceof Error ? error.message : 'Login failed.'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Box
      sx={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: '100vh',
        bgcolor: 'background.default',
      }}
    >
      <Card
        sx={{
          width: 400,
          borderRadius: 4,
        }}
      >
        <CardContent>
          <Typography
            variant="h5"
            sx={{ mb: 3 }}
          >
            Login
          </Typography>

          {loginError ? (
            <Alert severity="error" sx={{ mb: 2 }}>
              {loginError}
            </Alert>
          ) : null}

          <Box
            component="form"
            onSubmit={handleSubmit(onSubmit)}
            sx={{
              display: 'flex',
              flexDirection: 'column',
              gap: 2,
            }}
          >
            <TextField
              label="Email"
              {...register('email')}
              error={!!errors.email}
              helperText={errors.email?.message}
              fullWidth
            />

            <TextField
              label="Password"
              type="password"
              {...register('password')}
              error={!!errors.password}
              helperText={errors.password?.message}
              fullWidth
            />

            <Button
              type="submit"
              variant="contained"
              size="large"
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Signing in...' : 'Login'}
            </Button>
          </Box>
        </CardContent>
      </Card>
    </Box>
  );
};

export default LoginPage;
