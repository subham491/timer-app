import { Stack, Typography } from '@mui/material';
import { useTheme } from '@mui/material/styles';

import type { ProjectsSummaryMetric } from '@/features/projects/types/projectsPage.types';

import { getSummaryStripPaperSx, metricItemSx } from './projectsPage.styles';

interface ProjectsSummaryStripProps {
  metrics: ProjectsSummaryMetric[];
}

const ProjectsSummaryStrip = ({ metrics }: ProjectsSummaryStripProps) => {
  const theme = useTheme();

  return (
    <Stack direction="row" sx={getSummaryStripPaperSx(theme)}>
      {metrics.map((metric) => (
        <Stack key={metric.label} spacing={0.35} sx={metricItemSx}>
          <Typography variant="caption" color="text.secondary">
            {metric.label}
          </Typography>
          <Typography variant="h6" sx={{ fontSize: '1rem', fontWeight: 700 }}>
            {metric.value}
          </Typography>
        </Stack>
      ))}
    </Stack>
  );
};

export default ProjectsSummaryStrip;
