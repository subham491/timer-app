import AddRoundedIcon from '@mui/icons-material/AddRounded';
import CloseRoundedIcon from '@mui/icons-material/CloseRounded';
import DeleteOutlineRoundedIcon from '@mui/icons-material/DeleteOutlineRounded';
import {
  Box,
  Button,
  Checkbox,
  Drawer,
  IconButton,
  MenuItem,
  Stack,
  TextField,
  Typography,
} from '@mui/material';

import type {
  ProjectStatus,
  ProjectTaskDraft,
  ProjectTaskStatus,
  ProjectUserReference,
  ProjectsFormDraft,
} from '@/store/slices/projects/projects.types';

import {
  detailSectionSx,
  drawerBodySx,
  drawerContentSx,
  drawerFooterSx,
  drawerHeaderSx,
  drawerSectionTitleSx,
  primaryActionButtonSx,
  quietActionButtonSx,
  taskEditorBlockSx,
} from './projectsPage.styles';

interface ProjectFormDrawerProps {
  draft: ProjectsFormDraft;
  drawerMode: 'create' | 'edit';
  isOpen: boolean;
  onAssignmentUserIdsChange: (value: string[]) => void;
  onClose: () => void;
  onDescriptionChange: (value: string) => void;
  onDraftStatusChange: (value: ProjectStatus) => void;
  onNameChange: (value: string) => void;
  onProjectManagerUserIdsChange: (value: string[]) => void;
  onSave: () => void;
  onTasksChange: (value: ProjectTaskDraft[]) => void;
  users: ProjectUserReference[];
}

const createEmptyTaskDraft = (): ProjectTaskDraft => ({
  id: null,
  name: '',
  description: '',
  status: 'active',
});

const updateTaskAtIndex = (
  tasks: ProjectTaskDraft[],
  index: number,
  field: keyof ProjectTaskDraft,
  value: ProjectTaskDraft[keyof ProjectTaskDraft]
) =>
  tasks.map((task, taskIndex) =>
    taskIndex === index ? { ...task, [field]: value } : task
  );

const ProjectFormDrawer = ({
  draft,
  drawerMode,
  isOpen,
  onAssignmentUserIdsChange,
  onClose,
  onDescriptionChange,
  onDraftStatusChange,
  onNameChange,
  onProjectManagerUserIdsChange,
  onSave,
  onTasksChange,
  users,
}: ProjectFormDrawerProps) => {
  const hasValidTask = draft.tasks.some((task) => task.name.trim().length > 0);

  return (
    <Drawer anchor="right" open={isOpen} onClose={onClose}>
      <Box sx={drawerContentSx}>
        <Stack spacing={0} sx={{ height: '100%' }}>
          <Stack direction="row" sx={drawerHeaderSx}>
            <Box>
              <Typography variant="h6" sx={{ fontWeight: 800 }}>
                {drawerMode === 'create' ? 'New Project' : 'Edit Project'}
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                Set up project details, ownership, and tasks.
              </Typography>
            </Box>

            <IconButton size="small" onClick={onClose}>
              <CloseRoundedIcon fontSize="small" />
            </IconButton>
          </Stack>

          <Stack spacing={1.35} sx={drawerBodySx}>
            <Stack spacing={0.8}>
              <Typography sx={drawerSectionTitleSx}>Overview</Typography>
              <Stack spacing={1}>
                <TextField
                  label="Project name"
                  size="small"
                  value={draft.name}
                  onChange={(event) => onNameChange(event.target.value)}
                  fullWidth
                />

                <TextField
                  label="Description"
                  size="small"
                  value={draft.description}
                  onChange={(event) => onDescriptionChange(event.target.value)}
                  multiline
                  minRows={4}
                  fullWidth
                />

                <TextField
                  select
                  label="Status"
                  size="small"
                  value={draft.status}
                  onChange={(event) =>
                    onDraftStatusChange(event.target.value as ProjectStatus)
                  }
                >
                  <MenuItem value="active">Active</MenuItem>
                  <MenuItem value="archived">Archived</MenuItem>
                </TextField>
              </Stack>
            </Stack>

            <Stack spacing={0.8} sx={detailSectionSx}>
              <Typography sx={drawerSectionTitleSx}>Managers</Typography>
              <Stack spacing={1}>
                <TextField
                  select
                  label="Project Managers"
                  size="small"
                  value={draft.projectManagerUserIds}
                  onChange={(event) =>
                    onProjectManagerUserIdsChange(
                      typeof event.target.value === 'string'
                        ? event.target.value.split(',')
                        : event.target.value
                    )
                  }
                  slotProps={{
                    select: {
                      multiple: true,
                      renderValue: (selected: unknown) => {
                        const ids = selected as string[];
                        return ids.length === 0
                          ? 'Select managers'
                          : users
                              .filter((user) => ids.includes(user.id))
                              .map((user) => user.name)
                              .join(', ');
                      },
                    },
                  }}
                >
                  {users.map((user) => (
                    <MenuItem key={user.id} value={user.id}>
                      <Checkbox
                        size="small"
                        checked={draft.projectManagerUserIds.includes(user.id)}
                      />
                      <Typography variant="body2">{user.name}</Typography>
                    </MenuItem>
                  ))}
                </TextField>
              </Stack>
            </Stack>

            <Stack spacing={0.8} sx={detailSectionSx}>
              <Typography sx={drawerSectionTitleSx}>Assignments</Typography>
              <Stack spacing={1}>
                <TextField
                  select
                  label="Assign Users"
                  size="small"
                  value={draft.assignmentUserIds}
                  onChange={(event) =>
                    onAssignmentUserIdsChange(
                      typeof event.target.value === 'string'
                        ? event.target.value.split(',')
                        : event.target.value
                    )
                  }
                  slotProps={{
                    select: {
                      multiple: true,
                      renderValue: (selected: unknown) => {
                        const ids = selected as string[];
                        return ids.length === 0
                          ? 'Select users'
                          : users
                              .filter((user) => ids.includes(user.id))
                              .map((user) => user.name)
                              .join(', ');
                      },
                    },
                  }}
                >
                  {users.map((user) => (
                    <MenuItem key={user.id} value={user.id}>
                      <Checkbox
                        size="small"
                        checked={draft.assignmentUserIds.includes(user.id)}
                      />
                      <Typography variant="body2">{user.name}</Typography>
                    </MenuItem>
                  ))}
                </TextField>
              </Stack>
            </Stack>

            <Stack spacing={0.8} sx={detailSectionSx}>
              <Typography sx={drawerSectionTitleSx}>Tasks</Typography>

              {draft.tasks.map((task, index) => (
                <Stack
                  key={task.id ?? `draft-task-${index}`}
                  spacing={0.95}
                  sx={taskEditorBlockSx}
                >
                  <Stack direction="row" sx={{ alignItems: 'center', justifyContent: 'space-between' }}>
                    <Typography variant="body2" sx={{ fontWeight: 700 }}>
                      Task {index + 1}
                    </Typography>
                    <IconButton
                      size="small"
                      onClick={() =>
                        onTasksChange(
                          draft.tasks.length === 1
                            ? [createEmptyTaskDraft()]
                            : draft.tasks.filter((_, taskIndex) => taskIndex !== index)
                        )
                      }
                    >
                      <DeleteOutlineRoundedIcon fontSize="small" />
                    </IconButton>
                  </Stack>

                  <TextField
                    label="Task name"
                    size="small"
                    value={task.name}
                    onChange={(event) =>
                      onTasksChange(
                        updateTaskAtIndex(draft.tasks, index, 'name', event.target.value)
                      )
                    }
                    fullWidth
                  />

                  <TextField
                    label="Description"
                    size="small"
                    value={task.description}
                    onChange={(event) =>
                      onTasksChange(
                        updateTaskAtIndex(
                          draft.tasks,
                          index,
                          'description',
                          event.target.value
                        )
                      )
                    }
                    multiline
                    minRows={2}
                    fullWidth
                  />

                  <TextField
                    select
                    label="Task status"
                    size="small"
                    value={task.status}
                    onChange={(event) =>
                      onTasksChange(
                        updateTaskAtIndex(
                          draft.tasks,
                          index,
                          'status',
                          event.target.value as ProjectTaskStatus
                        )
                      )
                    }
                  >
                    <MenuItem value="active">Active</MenuItem>
                    <MenuItem value="archived">Archived</MenuItem>
                  </TextField>
                </Stack>
              ))}

              <Button
                variant="text"
                startIcon={<AddRoundedIcon />}
                onClick={() => onTasksChange([...draft.tasks, createEmptyTaskDraft()])}
                sx={{ ...quietActionButtonSx, minHeight: 32, px: 1.25 }}
              >
                Add another task
              </Button>
            </Stack>
          </Stack>

          <Box sx={drawerFooterSx}>
            <Stack direction="row" spacing={1} sx={{ justifyContent: 'flex-end' }}>
              <Button onClick={onClose}>Cancel</Button>
              <Button
                variant="contained"
                onClick={onSave}
                disabled={draft.name.trim().length < 2 || !hasValidTask}
                sx={{ ...primaryActionButtonSx, minHeight: 34, px: 1.4 }}
              >
                {drawerMode === 'create' ? 'Save Project' : 'Save Changes'}
              </Button>
            </Stack>
          </Box>
        </Stack>
      </Box>
    </Drawer>
  );
};

export default ProjectFormDrawer;
