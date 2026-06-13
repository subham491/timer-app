import CloseRoundedIcon from '@mui/icons-material/CloseRounded';
import {
  Box,
  Button,
  Drawer,
  IconButton,
  MenuItem,
  Stack,
  TextField,
  Typography,
} from '@mui/material';

import type {
  UserFormDraft,
  UserReference,
  UserRoleOption,
} from '@/features/users/types/usersPage.types';

import {
  drawerBodySx,
  drawerContentSx,
  drawerFooterSx,
  drawerHeaderSx,
  drawerSectionTitleSx,
  primaryActionButtonSx,
} from './usersPage.styles';

interface UserFormDrawerProps {
  canManageUsers: boolean;
  draft: UserFormDraft;
  drawerMode: 'create' | 'edit';
  isOpen: boolean;
  managerCandidates: UserReference[];
  onClose: () => void;
  onDisplayNameChange: (value: string) => void;
  onEmailChange: (value: string) => void;
  onPasswordChange: (value: string) => void;
  onManagerIdChange: (value: number | null) => void;
  onRoleIdChange: (value: number) => void;
  onSave: () => void;
  roles: UserRoleOption[];
}

const UserFormDrawer = ({
  canManageUsers,
  draft,
  drawerMode,
  isOpen,
  managerCandidates,
  onClose,
  onDisplayNameChange,
  onEmailChange,
  onPasswordChange,
  onManagerIdChange,
  onRoleIdChange,
  onSave,
  roles,
}: UserFormDrawerProps) => {
  const isEmailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(draft.email.trim());
  const needsReportingManager = draft.roleId === 1;
  const isCreateMode = drawerMode === 'create';
  const canSave =
    draft.displayName.trim().length >= 2 &&
    isEmailValid &&
    (!isCreateMode || draft.password.trim().length >= 8) &&
    draft.roleId > 0 &&
    (!needsReportingManager || draft.managerId != null);

  return (
    <Drawer anchor="right" open={isOpen} onClose={onClose}>
      <Box sx={drawerContentSx}>
        <Stack spacing={0} sx={{ height: '100%' }}>
          <Stack direction="row" sx={drawerHeaderSx}>
            <Box>
              <Typography variant="h6" sx={{ fontWeight: 800 }}>
                {drawerMode === 'create' ? 'New User' : 'Edit User'}
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                Set identity, access, and reporting structure in one clean workflow.
              </Typography>
            </Box>

            <IconButton size="small" onClick={onClose}>
              <CloseRoundedIcon fontSize="small" />
            </IconButton>
          </Stack>

          <Stack spacing={1.35} sx={drawerBodySx}>
            <Stack spacing={0.8}>
              <Typography sx={drawerSectionTitleSx}>Identity</Typography>
              <TextField
                label="Display name"
                size="small"
                value={draft.displayName}
                onChange={(event) => onDisplayNameChange(event.target.value)}
                fullWidth
              />

              <TextField
                label="Email"
                size="small"
                value={draft.email}
                onChange={(event) => onEmailChange(event.target.value)}
                fullWidth
              />

              {isCreateMode ? (
                <TextField
                  label="Password"
                  type="password"
                  size="small"
                  value={draft.password}
                  onChange={(event) => onPasswordChange(event.target.value)}
                  helperText="Use at least 8 characters."
                  fullWidth
                />
              ) : null}
            </Stack>

            <Stack spacing={0.8}>
              <Typography sx={drawerSectionTitleSx}>Access</Typography>
              <TextField
                select
                label="Role"
                size="small"
                value={draft.roleId}
                onChange={(event) => onRoleIdChange(Number(event.target.value))}
                disabled={!canManageUsers || draft.isSelf}
                helperText={
                  draft.isSelf
                    ? 'Your own role stays protected to prevent accidental lockout.'
                    : undefined
                }
              >
                {roles.map((role) => (
                  <MenuItem key={role.id} value={role.id}>
                    {role.label}
                  </MenuItem>
                ))}
              </TextField>

              {needsReportingManager ? (
                <TextField
                  select
                  label="Reports to"
                  size="small"
                  value={draft.managerId ?? ''}
                  onChange={(event) =>
                    onManagerIdChange(
                      event.target.value === '' ? null : Number(event.target.value)
                    )
                  }
                  disabled={!canManageUsers}
                  helperText="Regular users should report to a manager."
                >
                  <MenuItem value="">Select manager</MenuItem>
                  {managerCandidates
                    .filter((candidate) => candidate.userId !== draft.userId)
                    .map((candidate) => (
                      <MenuItem key={candidate.userId} value={candidate.userId}>
                        {candidate.displayName}
                      </MenuItem>
                    ))}
                </TextField>
              ) : (
                <TextField
                  label="Reporting line"
                  size="small"
                  value={
                    draft.roleId === 3
                      ? 'Managers sit above regular users'
                      : draft.roleId === 2
                        ? 'Report viewers stay outside the reporting line'
                        : 'Admins are the head of all users'
                  }
                  slotProps={{
                    input: {
                      readOnly: true,
                    },
                  }}
                />
              )}
            </Stack>
          </Stack>

          <Box sx={drawerFooterSx}>
            <Stack direction="row" spacing={1} sx={{ justifyContent: 'flex-end' }}>
              <Button onClick={onClose}>Cancel</Button>
              <Button
                variant="contained"
                onClick={onSave}
                disabled={!canSave || !canManageUsers}
                sx={{ ...primaryActionButtonSx, minHeight: 34, px: 1.4 }}
              >
                {drawerMode === 'create' ? 'Create User' : 'Save Changes'}
              </Button>
            </Stack>
          </Box>
        </Stack>
      </Box>
    </Drawer>
  );
};

export default UserFormDrawer;
