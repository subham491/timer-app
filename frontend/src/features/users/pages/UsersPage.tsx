import { Suspense } from 'react';

import { Box, CircularProgress, Stack, Typography } from '@mui/material';
import { useTheme } from '@mui/material/styles';

import {
  UserFormDrawer,
  UsersTable,
  UsersToolbar,
} from '@/features/users/components';
import { useUsersPageState } from '@/features/users/hooks/useUsersPageState';

import {
  getSummaryStripPaperSx,
  pageRootSx,
  summaryMetricSx,
} from '@/features/users/components/usersPage.styles';

const drawerFallbackSx = {
  position: 'fixed',
  right: 0,
  top: 0,
  bottom: 0,
  width: { xs: '100%', sm: 420 },
  px: 2,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  backgroundColor: 'background.paper',
  borderLeft: '1px solid',
  borderColor: 'divider',
  zIndex: 1200,
};

const UsersPage = () => {
  const theme = useTheme();
  const state = useUsersPageState();

  if (!state.canManageUsers) {
    return (
      <Stack sx={pageRootSx}>
        <Box sx={getSummaryStripPaperSx(theme)}>
          <Box sx={summaryMetricSx}>
            <Typography variant="body2" color="text.secondary">
              Admin access required
            </Typography>
            <Typography variant="h6" sx={{ fontWeight: 700 }}>
              Users management is reserved for administrators.
            </Typography>
          </Box>
        </Box>
      </Stack>
    );
  }

  return (
    <Stack sx={pageRootSx}>
      <UsersToolbar
        canManageUsers={state.canManageUsers}
        onOpenCreate={state.onOpenCreate}
        onRoleFilterChange={state.onRoleFilterChange}
        onSearchTextChange={state.onSearchTextChange}
        roleFilters={state.selectedRoleIds}
        roles={state.roleOptions}
        searchText={state.searchText}
      />

      <Box sx={getSummaryStripPaperSx(theme)}>
        {state.summaryMetrics.map((metric) => (
          <Box key={metric.label} sx={summaryMetricSx}>
            <Typography variant="caption" color="text.secondary">
              {metric.label}
            </Typography>
            <Typography variant="h6" sx={{ fontWeight: 700 }}>
              {metric.value}
            </Typography>
          </Box>
        ))}
      </Box>

      <UsersTable
        canManageUsers={state.canManageUsers}
        onDeleteUser={state.onDeleteUser}
        onEditUser={state.onOpenEdit}
        rows={state.filteredUsers}
      />

      <Suspense
        fallback={
          state.isDrawerOpen ? (
            <Box sx={drawerFallbackSx}>
              <Stack spacing={1} sx={{ alignItems: 'center' }}>
                <CircularProgress size={22} />
                <Typography variant="body2" color="text.secondary">
                  Loading user form
                </Typography>
              </Stack>
            </Box>
          ) : null
        }
      >
        <UserFormDrawer
          canManageUsers={state.canManageUsers}
          draft={state.draft}
          drawerMode={state.drawerMode}
          isOpen={state.isDrawerOpen}
          managerCandidates={state.managerCandidates}
          onClose={state.onCloseDrawer}
          onDisplayNameChange={state.onDraftDisplayNameChange}
          onEmailChange={state.onDraftEmailChange}
          onPasswordChange={state.onDraftPasswordChange}
          onManagerIdChange={state.onDraftManagerIdChange}
          onRoleIdChange={state.onDraftRoleIdChange}
          onSave={state.onSaveUser}
          roles={state.roleOptions}
        />
      </Suspense>
    </Stack>
  );
};

export default UsersPage;
