import MoreHorizRoundedIcon from '@mui/icons-material/MoreHorizRounded';
import EditRoundedIcon from '@mui/icons-material/EditRounded';
import RestoreRoundedIcon from '@mui/icons-material/RestoreRounded';
import VisibilityOffRoundedIcon from '@mui/icons-material/VisibilityOffRounded';
import { useState } from 'react';
import {
  Box,
  Button,
  Chip,
  IconButton,
  Menu,
  MenuItem,
  Stack,
  Typography,
} from '@mui/material';
import { alpha, useTheme } from '@mui/material/styles';

import type {
  ProjectActionPermissions,
  ProjectTableRow,
} from '@/features/projects/types/projectsPage.types';

import { getProjectCardSx, getTablePaperSx } from './projectsPage.styles';

interface ProjectsTableProps {
  getProjectPermissions: (projectId: string) => ProjectActionPermissions | null;
  onArchiveProject: (projectId: string) => void;
  onEditProject: (projectId: string) => void;
  onOpenProject: (projectId: string) => void;
  onRestoreProject: (projectId: string) => void;
  rows: ProjectTableRow[];
}

const ProjectsTable = ({
  getProjectPermissions,
  onArchiveProject,
  onEditProject,
  onOpenProject,
  onRestoreProject,
  rows,
}: ProjectsTableProps) => {
  const theme = useTheme();
  const [menuAnchorEl, setMenuAnchorEl] = useState<null | HTMLElement>(null);
  const [activeMenuProjectId, setActiveMenuProjectId] = useState<string | null>(null);

  const handleOpenMenu = (
    event: React.MouseEvent<HTMLButtonElement>,
    projectId: string
  ) => {
    setMenuAnchorEl(event.currentTarget);
    setActiveMenuProjectId(projectId);
  };

  const handleCloseMenu = () => {
    setMenuAnchorEl(null);
    setActiveMenuProjectId(null);
  };

  return (
    <Box sx={getTablePaperSx()}>
      {rows.length === 0 ? (
        <Box
          sx={{
            borderRadius: 3,
            px: 3,
            py: 6,
            textAlign: 'center',
            backgroundColor: alpha(theme.palette.background.paper, 0.78),
            boxShadow: `inset 0 0 0 1px ${alpha(theme.palette.divider, 0.5)}`,
          }}
        >
          <Typography variant="h6" sx={{ fontWeight: 700 }}>
            No projects match these filters
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Try widening the status or readiness filters, or search with a different term.
          </Typography>
        </Box>
      ) : (
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: {
              xs: 'minmax(0, 1fr)',
              md: 'repeat(auto-fit, minmax(320px, 420px))',
            },
            gap: 2,
            justifyContent: 'flex-start',
          }}
        >
          {rows.map((row) => {
            const permissions = getProjectPermissions(row.id);

            return (
              <Stack
                key={row.id}
                spacing={1.15}
                sx={{
                  ...getProjectCardSx(theme),
                  opacity: row.status === 'archived' ? 0.9 : 1,
                }}
              >
                <Stack spacing={0.85}>
                  <Stack
                    direction="row"
                    spacing={1}
                    sx={{ alignItems: 'flex-start', justifyContent: 'space-between' }}
                  >
                    <Stack spacing={1} sx={{ minWidth: 0, flex: 1 }}>
                      <Typography
                        variant="h6"
                        sx={{
                          fontSize: '1rem',
                          fontWeight: 700,
                          letterSpacing: '-0.02em',
                        }}
                      >
                        {row.name}
                      </Typography>

                      <Stack
                        direction="row"
                        spacing={0.75}
                        sx={{ flexWrap: 'wrap', alignItems: 'center' }}
                      >
                        <Chip
                          size="small"
                          label={row.status === 'active' ? 'Active' : 'Archived'}
                          color={row.status === 'active' ? 'success' : 'default'}
                          variant="outlined"
                          sx={{
                            height: 22,
                            borderRadius: 1.25,
                            backgroundColor:
                              row.status === 'active'
                                ? alpha(theme.palette.success.light, 0.06)
                                : alpha(theme.palette.common.black, 0.02),
                            borderColor:
                              row.status === 'active'
                                ? alpha(theme.palette.success.main, 0.18)
                                : alpha(theme.palette.divider, 0.5),
                          }}
                        />
                      </Stack>
                    </Stack>

                    {(permissions?.canEditProject ||
                      permissions?.canArchiveProject ||
                      permissions?.canRestoreProject) && (
                      <IconButton
                        size="small"
                        onClick={(event) => handleOpenMenu(event, row.id)}
                        sx={{
                          mt: -0.25,
                          color: 'text.secondary',
                          borderRadius: 1.5,
                          backgroundColor: alpha(theme.palette.common.black, 0.02),
                          '&:hover': {
                            backgroundColor: alpha(theme.palette.common.black, 0.05),
                          },
                        }}
                      >
                        <MoreHorizRoundedIcon fontSize="small" />
                      </IconButton>
                    )}
                  </Stack>
                </Stack>

                <Box
                  sx={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
                    gap: 1,
                  }}
                >
                  <Box>
                    <Typography variant="caption" color="text.secondary">
                      Tasks
                    </Typography>
                    <Typography variant="body1" sx={{ fontWeight: 700 }}>
                      {row.tasks.length}
                    </Typography>
                  </Box>
                  <Box>
                    <Typography variant="caption" color="text.secondary">
                      Assigned
                    </Typography>
                    <Typography variant="body1" sx={{ fontWeight: 700 }}>
                      {row.assignments.length}
                    </Typography>
                  </Box>
                  <Box>
                    <Typography variant="caption" color="text.secondary">
                      Managers
                    </Typography>
                    <Typography variant="body1" sx={{ fontWeight: 700 }}>
                      {row.projectManagers.length}
                    </Typography>
                  </Box>
                </Box>

                <Stack spacing={0.6}>
                  <Typography
                    variant="caption"
                    color="text.secondary"
                    sx={{ textTransform: 'uppercase', letterSpacing: '0.04em' }}
                  >
                    Project managers
                  </Typography>
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>
                    {row.projectManagers.map((manager) => manager.name).join(', ') || 'Not assigned'}
                  </Typography>
                </Stack>

                <Stack direction="row" spacing={1} sx={{ mt: 'auto', alignItems: 'center' }}>
                  <Button
                    variant="outlined"
                    onClick={() => onOpenProject(row.id)}
                    sx={{
                      minWidth: 0,
                      minHeight: 32,
                      px: 1.25,
                      py: 0.4,
                      fontSize: '0.83rem',
                      fontWeight: 600,
                      borderRadius: 1.5,
                    }}
                  >
                    Open
                  </Button>
                </Stack>

                <Menu
                  anchorEl={menuAnchorEl}
                  open={activeMenuProjectId === row.id}
                  onClose={handleCloseMenu}
                  transformOrigin={{ horizontal: 'right', vertical: 'top' }}
                  anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
                  slotProps={{
                    paper: {
                      elevation: 0,
                      sx: {
                        mt: 0.5,
                        minWidth: 170,
                        borderRadius: 2,
                        boxShadow: `0 14px 30px ${alpha(theme.palette.common.black, 0.12)}`,
                        border: `1px solid ${alpha(theme.palette.divider, 0.45)}`,
                      },
                    },
                  }}
                >
                  {permissions?.canEditProject ? (
                    <MenuItem
                      onClick={() => {
                        handleCloseMenu();
                        onEditProject(row.id);
                      }}
                    >
                      <EditRoundedIcon fontSize="small" />
                      <Box component="span" sx={{ ml: 1 }}>
                        Edit
                      </Box>
                    </MenuItem>
                  ) : null}

                  {permissions?.canArchiveProject ? (
                    <MenuItem
                      onClick={() => {
                        handleCloseMenu();
                        onArchiveProject(row.id);
                      }}
                    >
                      <VisibilityOffRoundedIcon fontSize="small" />
                      <Box component="span" sx={{ ml: 1 }}>
                        Archive
                      </Box>
                    </MenuItem>
                  ) : null}

                  {permissions?.canRestoreProject ? (
                    <MenuItem
                      onClick={() => {
                        handleCloseMenu();
                        onRestoreProject(row.id);
                      }}
                    >
                      <RestoreRoundedIcon fontSize="small" />
                      <Box component="span" sx={{ ml: 1 }}>
                        Restore
                      </Box>
                    </MenuItem>
                  ) : null}
                </Menu>
              </Stack>
            );
          })}
        </Box>
      )}
    </Box>
  );
};

export default ProjectsTable;
