import AccessTimeRoundedIcon from '@mui/icons-material/AccessTimeRounded';
import FolderRoundedIcon from '@mui/icons-material/FolderRounded';
import PlayCircleRoundedIcon from '@mui/icons-material/PlayCircleRounded';
import { Box, Paper, Skeleton, Stack, Typography } from '@mui/material';

import { formatCompactDuration } from '@/features/timer/utils';

interface StatCardProps {
  icon: React.ReactNode;
  isLoading: boolean;
  label: string;
  value: string;
}

const StatCard = ({ icon, isLoading, label, value }: StatCardProps) => (
  <Paper
    elevation={0}
    sx={{
      p: 2.5,
      border: '1px solid',
      borderColor: 'divider',
      borderRadius: 3,
      height: '100%',
    }}
  >
    <Stack direction="row" spacing={1.5} sx={{ alignItems: 'flex-start' }}>
      <Box
        sx={{
          width: 36,
          height: 36,
          borderRadius: '50%',
          bgcolor: 'primary.main',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'primary.contrastText',
          flexShrink: 0,
          opacity: 0.85,
        }}
      >
        {icon}
      </Box>
      <Box>
        <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
          {label}
        </Typography>
        {isLoading ? (
          <Skeleton width={72} height={28} />
        ) : (
          <Typography variant="h5" sx={{ fontWeight: 600, lineHeight: 1.2 }}>
            {value}
          </Typography>
        )}
      </Box>
    </Stack>
  </Paper>
);

interface ReportsStatCardsProps {
  isLoading: boolean;
  totalSeconds: number;
  totalSessions: number;
  uniqueProjects: number;
}

export const ReportsStatCards = ({
  isLoading,
  totalSeconds,
  totalSessions,
  uniqueProjects,
}: ReportsStatCardsProps) => (
  <Box
    sx={{
      display: 'grid',
      gap: 2,
      gridTemplateColumns: {
        xs: '1fr',
        sm: 'repeat(3, minmax(0, 1fr))',
      },
    }}
  >
    <Box>
      <StatCard
        icon={<AccessTimeRoundedIcon fontSize="small" />}
        isLoading={isLoading}
        label="Total hours"
        value={formatCompactDuration(totalSeconds)}
      />
    </Box>
    <Box>
      <StatCard
        icon={<PlayCircleRoundedIcon fontSize="small" />}
        isLoading={isLoading}
        label="Sessions"
        value={String(totalSessions)}
      />
    </Box>
    <Box>
      <StatCard
        icon={<FolderRoundedIcon fontSize="small" />}
        isLoading={isLoading}
        label="Projects"
        value={String(uniqueProjects)}
      />
    </Box>
  </Box>
);
