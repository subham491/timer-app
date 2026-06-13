import { useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';

import AccessTimeRoundedIcon from '@mui/icons-material/AccessTimeRounded';
import AnalyticsRoundedIcon from '@mui/icons-material/AnalyticsRounded';
import LogoutRoundedIcon from '@mui/icons-material/LogoutRounded';
import MenuRoundedIcon from '@mui/icons-material/MenuRounded';
import PeopleAltRoundedIcon from '@mui/icons-material/PeopleAltRounded';
import SourceRoundedIcon from '@mui/icons-material/SourceRounded';
import SupportAgentRoundedIcon from '@mui/icons-material/SupportAgentRounded';

import {
  AppBar,
  Box,
  Button,
  Drawer,
  IconButton,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Tooltip,
  Toolbar,
  useMediaQuery,
} from '@mui/material';
import { alpha, useTheme } from '@mui/material/styles';
import { useQueryClient } from '@tanstack/react-query';

import ThemeToggle from '@/shared/components/navigation/ThemeToggle';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { logout } from '@/store/slices/auth/authSlice';
import { selectAuthUser } from '@/store/slices/auth/authSelectors';

const drawerWidth = 220;

const navigationItems = [
  {
    label: 'Timeboard',
    icon: <AccessTimeRoundedIcon />,
    to: '/dashboard',
  },
  {
    label: 'Projects',
    icon: <SourceRoundedIcon />,
    to: '/dashboard/projects',
  },
  {
    label: 'Reports',
    icon: <AnalyticsRoundedIcon />,
    to: '/dashboard/reports',
  },
  {
    label: 'Users',
    icon: <PeopleAltRoundedIcon />,
    to: '/dashboard/users',
  },
];

const DashboardLayout = () => {
  const theme = useTheme();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const dispatch = useAppDispatch();
  const authUser = useAppSelector(selectAuthUser);
  const isDesktop = useMediaQuery(theme.breakpoints.up('lg'));
  const [mobileOpen, setMobileOpen] = useState(false);
  const userLabel = authUser?.name?.trim() || authUser?.email || 'User';
  const visibleNavigationItems = navigationItems;

  const handleLogout = async () => {
    dispatch(logout());
    queryClient.clear();
    navigate('/login', { replace: true });
  };

  const drawerContent = (
    <Box
      sx={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        px: 1.5,
        py: 2,
        bgcolor: '#0b57a4',
        background: 'linear-gradient(180deg, #0f5bac 0%, #0a4d94 100%)',
        color: '#f8fbff',
      }}
    >
      <Box
        sx={{
          minHeight: 116,
          display: 'grid',
          placeItems: 'center',
          px: 1,
          pt: 1,
          pb: 2.5,
        }}
      >
        <Box
          component="img"
          src="/soliton_logo.jpg"
          alt="Soliton"
          sx={{
            width: '100%',
            maxWidth: 132,
            height: 'auto',
            objectFit: 'contain',
          }}
        />
      </Box>

      <List sx={{ mt: 0.5 }}>
        {visibleNavigationItems.map((item) => (
          <Tooltip key={item.label} title="" placement="right">
            <ListItemButton
              component={NavLink}
              to={item.to}
              onClick={() => setMobileOpen(false)}
              sx={{
                minHeight: 46,
                mb: 1.2,
                borderRadius: 2,
                px: 1.4,
                color: alpha('#ffffff', 1),
                '&.active': {
                  bgcolor: alpha('#032c57', 0.34),
                  boxShadow: `inset 0 0 0 1px ${alpha('#74c0ff', 0.12)}`,
                },
                '&:hover': {
                  bgcolor: alpha('#032c57', 0.22),
                },
              }}
            >
              <ListItemIcon
                sx={{
                  color: 'inherit',
                  minWidth: 34,
                  opacity: 0.95,
                }}
              >
                {item.icon}
              </ListItemIcon>
              <ListItemText
                primary={item.label}
                slotProps={{
                  primary: {
                    sx: {
                      fontWeight: 600,
                      fontSize: '1rem',
                    },
                  },
                }}
              />
            </ListItemButton>
          </Tooltip>
        ))}
      </List>

      <Box sx={{ flex: 1 }} />

      <Box
        sx={{
          mt: 2,
          pt: 2,
          borderTop: `1px solid ${alpha('#8fc8ff', 0.22)}`,
        }}
      >
        <ListItemButton
          sx={{
            minHeight: 44,
            borderRadius: 2,
            px: 1.4,
            color: alpha('#ffffff', 0.78),
            '&:hover': {
              bgcolor: alpha('#032c57', 0.22),
            },
          }}
        >
          <ListItemIcon sx={{ color: 'inherit', minWidth: 34 }}>
            <SupportAgentRoundedIcon />
          </ListItemIcon>
          <ListItemText
            primary="Feedback"
            slotProps={{
              primary: {
                sx: {
                  fontWeight: 500,
                  fontSize: '0.98rem',
                },
              },
            }}
          />
        </ListItemButton>
      </Box>
    </Box>
  );

  return (
    <Box
      sx={{
        display: 'flex',
        minHeight: '100vh',
        bgcolor:
          theme.palette.mode === 'light'
            ? '#eef4fb'
            : '#020617',
      }}
    >
      {isDesktop ? (
        <Drawer
          variant="permanent"
          open
          slotProps={{
            paper: {
              sx: {
                width: drawerWidth,
                border: 'none',
              },
            },
          }}
        >
          {drawerContent}
        </Drawer>
      ) : (
        <Drawer
          variant="temporary"
          open={mobileOpen}
          onClose={() => setMobileOpen(false)}
          ModalProps={{ keepMounted: true }}
          slotProps={{
            paper: {
              sx: {
                width: drawerWidth,
                border: 'none',
              },
            },
          }}
        >
          {drawerContent}
        </Drawer>
      )}

      <Box
        sx={{
          flex: 1,
          minWidth: 0,
          ml: isDesktop ? `${drawerWidth}px` : 0,
        }}
      >
        <AppBar
          position="sticky"
          elevation={0}
          sx={{
            bgcolor: alpha(theme.palette.background.paper, 0.88),
            backdropFilter: 'blur(18px)',
            borderBottom: `1px solid ${alpha(theme.palette.divider, 0.65)}`,
            color: 'text.primary',
          }}
        >
          <Toolbar sx={{ gap: 2 }}>
            {!isDesktop && (
              <IconButton onClick={() => setMobileOpen(true)} color="inherit">
                <MenuRoundedIcon />
              </IconButton>
            )}

            <Box sx={{ flex: 1 }} />

            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 1,
              }}
            >
              <Box
                sx={{
                  display: { xs: 'none', sm: 'block' },
                  color: 'text.secondary',
                  fontSize: '0.92rem',
                  fontWeight: 500,
                }}
              >
                {userLabel}
              </Box>

              <Button
                color="inherit"
                size="small"
                startIcon={<LogoutRoundedIcon fontSize="small" />}
                onClick={() => {
                  void handleLogout();
                }}
                sx={{
                  minWidth: 0,
                  borderRadius: 2,
                  px: 1.25,
                  color: 'text.secondary',
                }}
              >
                Logout
              </Button>
            </Box>

            <ThemeToggle />
          </Toolbar>
        </AppBar>

        <Box
          component="main"
          sx={{
            px: { xs: 2, sm: 3, lg: 4 },
            py: { xs: 2, sm: 3 },
          }}
        >
          <Outlet />
        </Box>
      </Box>
    </Box>
  );
};

export default DashboardLayout;
