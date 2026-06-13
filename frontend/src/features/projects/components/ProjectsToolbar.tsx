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

import type {
  ProjectStatus,
} from '@/store/slices/projects/projects.types';
import type { AuthUserRole } from '@/store/slices/auth/auth.types';

import {
  getToolbarPaperSx,
  pageSubtitleSx,
  pageTitleSx,
} from './projectsPage.styles';

interface ProjectsToolbarProps {
  onOpenCreate: () => void;
  onSearchTextChange: (value: string) => void;
  onStatusChange: (value: ProjectStatus[]) => void;
  searchText: string;
  statusFilters: ProjectStatus[];
  userRole: AuthUserRole;
}

const projectStatusOptions: ProjectStatus[] = ['active', 'archived'];

const ProjectsToolbar = ({
  onOpenCreate,
  onSearchTextChange,
  onStatusChange,
  searchText,
  statusFilters,
  userRole,
}: ProjectsToolbarProps) => {
  const theme = useTheme();
  const canCreateProject =
    userRole === 'administrator' || userRole === 'manager';

  return (
    <Box sx={getToolbarPaperSx(theme)}>
      <Stack
        direction={{ xs: 'column', lg: 'row' }}
        spacing={1.5}
        sx={{ alignItems: { xs: 'stretch', lg: 'center' } }}
      >
        <Stack spacing={0.4} sx={{ minWidth: { lg: 280 } }}>
          <Typography sx={pageTitleSx}>Projects</Typography>
          <Typography color="text.secondary" sx={pageSubtitleSx}>
            Manage project workspaces and team ownership.
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
            placeholder="Search projects..."
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
            label="Status"
            value={statusFilters}
            onChange={(event) =>
              onStatusChange(
                typeof event.target.value === 'string'
                  ? (event.target.value.split(',') as ProjectStatus[])
                  : (event.target.value as ProjectStatus[])
              )
            }
            size="small"
            sx={{ minWidth: { xs: '100%', md: 168 } }}
            slotProps={{
              select: {
                multiple: true,
                renderValue: (selected: unknown) => {
                  const values = selected as ProjectStatus[];
                  return values.length === 0
                    ? 'All statuses'
                    : values
                        .map((status) => (status === 'active' ? 'Active' : 'Archived'))
                        .join(', ');
                },
              },
            }}
          >
            {projectStatusOptions.map((status) => (
              <MenuItem key={status} value={status}>
                <Checkbox size="small" checked={statusFilters.includes(status)} />
                <Typography variant="body2">
                  {status === 'active' ? 'Active' : 'Archived'}
                </Typography>
              </MenuItem>
            ))}
          </TextField>
        </Stack>

        <Stack
          direction="row"
          spacing={1.25}
          sx={{
            ml: { lg: 'auto' },
            alignItems: 'center',
            justifyContent: { xs: 'flex-end', lg: 'flex-end' },
          }}
        >
          <Button
            variant="contained"
            onClick={onOpenCreate}
            disabled={!canCreateProject}
            sx={{ boxShadow: 'none', borderRadius: 1.75 }}
          >
            New project
          </Button>
        </Stack>
      </Stack>
    </Box>
  );
};

export default ProjectsToolbar;
