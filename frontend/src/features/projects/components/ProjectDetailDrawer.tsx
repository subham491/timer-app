import AddTaskRoundedIcon from '@mui/icons-material/AddTaskRounded';
import CloseRoundedIcon from '@mui/icons-material/CloseRounded';
import EditRoundedIcon from '@mui/icons-material/EditRounded';
import GroupsRoundedIcon from '@mui/icons-material/GroupsRounded';
import PersonAddAlt1RoundedIcon from '@mui/icons-material/PersonAddAlt1Rounded';
import RestoreRoundedIcon from '@mui/icons-material/RestoreRounded';
import VisibilityOffRoundedIcon from '@mui/icons-material/VisibilityOffRounded';
import {
  Box,
  Button,
  Chip,
  Drawer,
  IconButton,
  Stack,
  Typography,
} from '@mui/material';

import type {
  ProjectActionPermissions,
  ProjectTableRow,
} from '@/features/projects/types/projectsPage.types';

import {
  detailSectionSx,
  drawerBodySx,
  drawerContentSx,
  drawerFooterSx,
  drawerHeaderSx,
  drawerSectionTitleSx,
  primaryActionButtonSx,
  quietActionButtonSx,
  secondaryActionButtonSx,
} from './projectsPage.styles';

interface ProjectDetailDrawerProps {
  isOpen: boolean;
  onArchiveProject: (projectId: string) => void;
  onClose: () => void;
  onEditProject: (projectId: string) => void;
  onRestoreProject: (projectId: string) => void;
  permissions: ProjectActionPermissions | null;
  project: ProjectTableRow | null;
}

const ProjectDetailDrawer = ({
  isOpen,
  onArchiveProject,
  onClose,
  onEditProject,
  onRestoreProject,
  permissions,
  project,
}: ProjectDetailDrawerProps) => (
  <Drawer anchor="right" open={isOpen} onClose={onClose}>
    <Box sx={drawerContentSx}>
      <Stack spacing={0} sx={{ height: '100%' }}>
        <Stack direction="row" sx={drawerHeaderSx}>
          <Stack spacing={0.75}>
            <Typography variant="h6" sx={{ fontWeight: 800 }}>
              {project?.name ?? 'Project'}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Review the project details, assignments, and task setup.
            </Typography>
            <Stack direction="row" spacing={0.75}>
              <Chip
                size="small"
                label={project?.status === 'active' ? 'Active' : 'Archived'}
                color={project?.status === 'active' ? 'success' : 'default'}
                variant="outlined"
                sx={{ borderRadius: 1.5 }}
              />
            </Stack>
          </Stack>

          <IconButton size="small" onClick={onClose}>
            <CloseRoundedIcon fontSize="small" />
          </IconButton>
        </Stack>

        {project ? (
          <Stack spacing={1.35} sx={drawerBodySx}>
            <Typography variant="body2" color="text.secondary">
              {project.description}
            </Typography>

            <Stack spacing={0.8} sx={detailSectionSx}>
              <Typography sx={drawerSectionTitleSx}>
                Overview
              </Typography>
              <Typography variant="body2">{project.tasks.length} Tasks</Typography>
              <Typography variant="body2">
                {project.assignments.length} Assigned Users
              </Typography>
              <Typography variant="body2">
                {project.projectManagers.length} Project Managers
              </Typography>
              {project.timerReadinessReason ? (
                <Typography variant="caption" color="warning.main">
                  Reason: {project.timerReadinessReason}
                </Typography>
              ) : null}
            </Stack>

            <Stack spacing={0.8} sx={detailSectionSx}>
              <Typography sx={drawerSectionTitleSx}>
                Managers
              </Typography>
              {project.projectManagers.map((manager) => (
                <Typography key={manager.id} variant="body2">
                  {manager.name}
                </Typography>
              ))}
              {permissions?.canManageManagers ? (
                <Button
                  variant="outlined"
                  startIcon={<GroupsRoundedIcon />}
                  onClick={() => onEditProject(project.id)}
                  sx={{ ...quietActionButtonSx, minHeight: 32, px: 1.25 }}
                >
                  Manage Managers
                </Button>
              ) : null}
            </Stack>

            <Stack spacing={0.8} sx={detailSectionSx}>
              <Typography sx={drawerSectionTitleSx}>
                Assignments
              </Typography>
              {project.assignments.slice(0, 4).map((assignment) => (
                <Typography key={assignment.id} variant="body2">
                  {assignment.name}
                </Typography>
              ))}
              {project.assignments.length > 4 ? (
                <Typography variant="caption" color="text.secondary">
                  +{project.assignments.length - 4} more
                </Typography>
              ) : null}
              {permissions?.canManageAssignments ? (
                <Button
                  variant="outlined"
                  startIcon={<PersonAddAlt1RoundedIcon />}
                  onClick={() => onEditProject(project.id)}
                  sx={{ ...quietActionButtonSx, minHeight: 32, px: 1.25 }}
                >
                  Manage Assignments
                </Button>
              ) : null}
            </Stack>

            <Stack spacing={0.8} sx={detailSectionSx}>
              <Typography sx={drawerSectionTitleSx}>
                Tasks
              </Typography>
              {project.tasks.map((task) => (
                <Stack
                  key={task.id}
                  direction="row"
                  spacing={1}
                  sx={{ alignItems: 'flex-start', justifyContent: 'space-between' }}
                >
                  <Box>
                    <Typography variant="body2" sx={{ fontWeight: 700 }}>
                      {task.name}
                    </Typography>
                  </Box>
                  <Chip
                    size="small"
                    label={task.status === 'active' ? 'Active' : 'Archived'}
                    color={task.status === 'active' ? 'success' : 'default'}
                    variant="outlined"
                    sx={{ borderRadius: 1.5 }}
                  />
                </Stack>
              ))}
              {permissions?.canManageTasks ? (
                <Button
                  variant="outlined"
                  startIcon={<AddTaskRoundedIcon />}
                  onClick={() => onEditProject(project.id)}
                  sx={{ ...quietActionButtonSx, minHeight: 32, px: 1.25 }}
                >
                  Add Task
                </Button>
              ) : null}
            </Stack>
          </Stack>
        ) : null}

        {project ? (
          <Box sx={drawerFooterSx}>
            <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap' }}>
              {permissions?.canEditProject ? (
                <Button
                  variant="contained"
                  startIcon={<EditRoundedIcon />}
                  onClick={() => onEditProject(project.id)}
                  sx={{ ...primaryActionButtonSx, minHeight: 34, px: 1.4 }}
                >
                  Edit Project
                </Button>
              ) : null}
              {permissions?.canArchiveProject ? (
                <Button
                  variant="outlined"
                  color="inherit"
                  startIcon={<VisibilityOffRoundedIcon />}
                  onClick={() => onArchiveProject(project.id)}
                  sx={{ ...secondaryActionButtonSx, minHeight: 34, px: 1.35 }}
                >
                  Archive Project
                </Button>
              ) : null}
              {permissions?.canRestoreProject ? (
                <Button
                  variant="outlined"
                  startIcon={<RestoreRoundedIcon />}
                  onClick={() => onRestoreProject(project.id)}
                  sx={{ ...secondaryActionButtonSx, minHeight: 34, px: 1.35 }}
                >
                  Restore Project
                </Button>
              ) : null}
            </Stack>
          </Box>
        ) : null}
      </Stack>
    </Box>
  </Drawer>
);

export default ProjectDetailDrawer;
