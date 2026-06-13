import SearchRoundedIcon from '@mui/icons-material/SearchRounded';
import {
  Box,
  Button,
  Checkbox,
  InputAdornment,
  MenuItem,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { useTheme } from '@mui/material/styles';

import type { UserRoleOption } from '@/features/users/types/usersPage.types';

import {
  getToolbarPaperSx,
  pageSubtitleSx,
  pageTitleSx,
} from './usersPage.styles';

interface UsersToolbarProps {
  canManageUsers: boolean;
  onOpenCreate: () => void;
  onRoleFilterChange: (value: number[]) => void;
  onSearchTextChange: (value: string) => void;
  roleFilters: number[];
  roles: UserRoleOption[];
  searchText: string;
}

const UsersToolbar = ({
  canManageUsers,
  onOpenCreate,
  onRoleFilterChange,
  onSearchTextChange,
  roleFilters,
  roles,
  searchText,
}: UsersToolbarProps) => {
  const theme = useTheme();

  return (
    <Box sx={getToolbarPaperSx(theme)}>
      <Stack
        direction={{ xs: 'column', lg: 'row' }}
        spacing={1.5}
        sx={{ alignItems: { xs: 'stretch', lg: 'center' } }}
      >
        <Stack spacing={0.4} sx={{ minWidth: { lg: 300 } }}>
          <Typography sx={pageTitleSx}>Users</Typography>
          <Typography color="text.secondary" sx={pageSubtitleSx}>
            Create accounts, assign roles, and keep access tidy without leaving the page.
          </Typography>
        </Stack>

        <Stack
          direction={{ xs: 'column', md: 'row' }}
          spacing={1}
          sx={{
            flex: 1,
            alignItems: { xs: 'stretch', md: 'center' },
            justifyContent: 'flex-end',
          }}
        >
          <TextField
            value={searchText}
            onChange={(event) => onSearchTextChange(event.target.value)}
            placeholder="Search users, roles, or managers..."
            size="small"
            fullWidth
            slotProps={{
              input: {
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchRoundedIcon fontSize="small" />
                  </InputAdornment>
                ),
              },
            }}
            sx={{
              flex: 1,
              minWidth: { xs: '100%', md: 320 },
            }}
          />

          <TextField
            select
            label="Roles"
            value={roleFilters}
            onChange={(event) =>
              onRoleFilterChange(
                typeof event.target.value === 'string'
                  ? event.target.value.split(',').map((value) => Number(value))
                  : (event.target.value as number[])
              )
            }
            size="small"
            sx={{ minWidth: { xs: '100%', md: 210 } }}
            slotProps={{
              select: {
                multiple: true,
                renderValue: (selected: unknown) => {
                  const values = selected as number[];
                  return values.length === 0
                    ? 'All roles'
                    : roles
                        .filter((role) => values.includes(role.id))
                        .map((role) => role.label)
                        .join(', ');
                },
              },
            }}
          >
            {roles.map((role) => (
              <MenuItem key={role.id} value={role.id}>
                <Checkbox size="small" checked={roleFilters.includes(role.id)} />
                <Typography variant="body2">{role.label}</Typography>
              </MenuItem>
            ))}
          </TextField>
        </Stack>

        <Stack direction="row" sx={{ justifyContent: { xs: 'flex-end', lg: 'flex-end' } }}>
          <Button
            variant="contained"
            onClick={onOpenCreate}
            disabled={!canManageUsers}
            sx={{ boxShadow: 'none', borderRadius: 1.75 }}
          >
            New user
          </Button>
        </Stack>
      </Stack>
    </Box>
  );
};

export default UsersToolbar;
