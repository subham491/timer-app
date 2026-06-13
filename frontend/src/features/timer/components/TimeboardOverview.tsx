import type { ReactNode } from 'react';

import AccessTimeRoundedIcon from '@mui/icons-material/AccessTimeRounded';
import CalendarTodayRoundedIcon from '@mui/icons-material/CalendarTodayRounded';
import TrendingUpRoundedIcon from '@mui/icons-material/TrendingUpRounded';
import { Box, Chip, Paper, Stack, Typography } from '@mui/material';
import { useTheme } from '@mui/material/styles';

import {
  getOverviewChipSx,
  getOverviewDescriptionSx,
  getOverviewPaperSx,
  getOverviewStatIconSx,
  getOverviewStatLabelSx,
  getOverviewStatPaperSx,
  getOverviewStatSubtitleSx,
  overviewContentSx,
  overviewLayoutSx,
  overviewStatLayoutSx,
  overviewStatsSx,
  overviewStatValueSx,
  overviewTitleSx,
} from './timeboardOverview.styles';

interface TimeboardOverviewProps {
  liveValue: string;
  todayValue: string;
  weekValue: string;
}

interface OverviewStatCard {
  icon: ReactNode;
  subtitle: string;
  title: string;
  value: string;
}

const TimeboardOverview = ({
  liveValue,
  todayValue,
  weekValue,
}: TimeboardOverviewProps) => {
  const theme = useTheme();

  const statCards: OverviewStatCard[] = [
    {
      title: 'Week',
      subtitle: 'All projects',
      value: weekValue,
      icon: <TrendingUpRoundedIcon />,
    },
    {
      title: 'Live',
      subtitle: 'Current session',
      value: liveValue,
      icon: <AccessTimeRoundedIcon />,
    },
    {
      title: 'Today',
      subtitle: 'Today total',
      value: todayValue,
      icon: <CalendarTodayRoundedIcon />,
    },
  ];

  return (
    <Paper elevation={0} sx={getOverviewPaperSx(theme)}>
      <Stack direction={{ xs: 'column', lg: 'row' }} spacing={2} sx={overviewLayoutSx}>
        <Box sx={overviewContentSx}>
          <Chip label="Timer" size="small" sx={getOverviewChipSx(theme)} />

          <Typography variant="h5" sx={overviewTitleSx}>
            Timeboard overview
          </Typography>

          <Typography variant="body2" sx={getOverviewDescriptionSx(theme)}>
            Track work, review totals, and resume recent entries from one view.
          </Typography>

          <Stack direction="row" spacing={1} sx={overviewStatsSx}>
            {statCards.map((card) => (
              <Paper key={card.title} elevation={0} sx={getOverviewStatPaperSx(theme)}>
                <Stack direction="row" spacing={2} sx={overviewStatLayoutSx}>
                  <Box>
                    <Typography variant="caption" sx={getOverviewStatLabelSx(theme)}>
                      {card.title}
                    </Typography>

                    <Typography variant="h6" sx={overviewStatValueSx}>
                      {card.value}
                    </Typography>

                    <Typography
                      variant="caption"
                      sx={getOverviewStatSubtitleSx(theme)}
                    >
                      {card.subtitle}
                    </Typography>
                  </Box>

                  <Box sx={getOverviewStatIconSx(theme)}>{card.icon}</Box>
                </Stack>
              </Paper>
            ))}
          </Stack>
        </Box>
      </Stack>
    </Paper>
  );
};

export default TimeboardOverview;
