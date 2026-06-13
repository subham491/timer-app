import SearchRoundedIcon from '@mui/icons-material/SearchRounded';
import {
  Checkbox,
  InputAdornment,
  MenuItem,
  Paper,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { useTheme } from '@mui/material/styles';

import {
  filterSelectSx,
  filtersLayoutSx,
  getFiltersPaperSx,
} from './timerFilters.styles';

interface TimerFiltersProps {
  allProjects: string[];
  allTasks: string[];
  onProjectFiltersChange: (value: string[]) => void;
  onSearchTextChange: (value: string) => void;
  onTaskFiltersChange: (value: string[]) => void;
  projectFilters: string[];
  searchText: string;
  taskFilters: string[];
}

const TimerFilters = ({
  allProjects,
  allTasks,
  onProjectFiltersChange,
  onSearchTextChange,
  onTaskFiltersChange,
  projectFilters,
  searchText,
  taskFilters,
}: TimerFiltersProps) => {
  const theme = useTheme();

  return (
    <Paper elevation={0} sx={getFiltersPaperSx(theme)}>
      <Stack {...filtersLayoutSx}>
        <TextField
          label="Search note"
          placeholder="Search by note"
          value={searchText}
          onChange={(event) => onSearchTextChange(event.target.value)}
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
        />

        <TextField
          select
          label="Project"
          value={projectFilters}
          onChange={(event) =>
            onProjectFiltersChange(
              typeof event.target.value === 'string'
                ? event.target.value.split(',')
                : event.target.value
            )
          }
          size="small"
          sx={filterSelectSx}
          slotProps={{
            select: {
              multiple: true,
              renderValue: (selected: unknown) =>
                (selected as string[]).length === 0
                  ? 'All projects'
                  : (selected as string[]).join(', '),
            },
          }}
        >
          {allProjects.map((project) => (
            <MenuItem key={project} value={project}>
              <Checkbox
                size="small"
                checked={projectFilters.includes(project)}
              />
              <Typography variant="body2">{project}</Typography>
            </MenuItem>
          ))}
        </TextField>

        <TextField
          select
          label="Task"
          value={taskFilters}
          onChange={(event) =>
            onTaskFiltersChange(
              typeof event.target.value === 'string'
                ? event.target.value.split(',')
                : event.target.value
            )
          }
          size="small"
          sx={filterSelectSx}
          slotProps={{
            select: {
              multiple: true,
              renderValue: (selected: unknown) =>
                (selected as string[]).length === 0
                  ? 'All tasks'
                  : (selected as string[]).join(', '),
            },
          }}
        >
          {allTasks.map((task) => (
            <MenuItem key={task} value={task}>
              <Checkbox
                size="small"
                checked={taskFilters.includes(task)}
              />
              <Typography variant="body2">{task}</Typography>
            </MenuItem>
          ))}
        </TextField>
      </Stack>
    </Paper>
  );
};

export default TimerFilters;
