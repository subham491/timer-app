import EditRoundedIcon from '@mui/icons-material/EditRounded';
import AddRoundedIcon from '@mui/icons-material/AddRounded';
import { Box, Button, Paper, Stack, Typography } from '@mui/material';
import type { Theme } from '@mui/material/styles';
import { useEffect, useMemo, useRef, useState } from 'react';

import { formatDuration } from '@/features/timer/utils';
import type { TimerEntry } from '@/store/slices/timer/timer.types';

interface RecentWorkListProps {
  entries: TimerEntry[];
  onAddManualEntry: () => void;
  onEditEntry: (entryId: string) => void;
}

const INITIAL_BATCH_SIZE = 12;
const LOAD_MORE_BATCH_SIZE = 10;
const SCROLL_THRESHOLD_PX = 120;

const paperSx = (theme: Theme) => ({
  border: `1px solid ${
    theme.palette.mode === 'dark'
      ? 'rgba(255,255,255,0.08)'
      : 'rgba(15,23,42,0.08)'
  }`,
  borderRadius: 3,
  p: { xs: 2, md: 2.5 },
  background:
    theme.palette.mode === 'dark'
      ? 'linear-gradient(180deg, rgba(31,35,44,0.97) 0%, rgba(38,43,52,0.92) 100%)'
      : 'linear-gradient(180deg, rgba(255,255,255,0.98) 0%, rgba(246,248,251,0.98) 100%)',
  boxShadow:
    theme.palette.mode === 'dark'
      ? '0 16px 34px rgba(0, 0, 0, 0.24)'
      : '0 14px 30px rgba(15, 23, 42, 0.06)',
});

const rowSx = (theme: Theme) => ({
  borderRadius: 2.5,
  px: { xs: 1.4, md: 1.75 },
  py: 1.55,
  border: `1px solid ${
    theme.palette.mode === 'dark'
      ? 'rgba(255,255,255,0.06)'
      : 'rgba(15,23,42,0.07)'
  }`,
  backgroundColor:
    theme.palette.mode === 'dark'
      ? 'rgba(255,255,255,0.025)'
      : 'rgba(255,255,255,0.92)',
});

const formatRange = (
  startTime: string,
  endTime: string | null
) => `${startTime}-${endTime ?? 'Now'}`;

const scrollContainerSx = (theme: Theme) => ({
  maxHeight: { xs: 420, md: 480 },
  overflowY: 'auto',
  pr: 0.5,
  mr: -0.5,
  scrollbarWidth: 'thin',
  scrollbarColor:
    theme.palette.mode === 'dark'
      ? 'rgba(255,255,255,0.16) transparent'
      : 'rgba(15,23,42,0.16) transparent',
  '&::-webkit-scrollbar': {
    width: 8,
  },
  '&::-webkit-scrollbar-track': {
    background: 'transparent',
  },
  '&::-webkit-scrollbar-thumb': {
    borderRadius: 999,
    backgroundColor:
      theme.palette.mode === 'dark'
        ? 'rgba(255,255,255,0.14)'
        : 'rgba(15,23,42,0.14)',
  },
});

const RecentWorkList = ({
  entries,
  onAddManualEntry,
  onEditEntry,
}: RecentWorkListProps) => {
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);
  const [visibleCount, setVisibleCount] = useState(INITIAL_BATCH_SIZE);

  useEffect(() => {
    setVisibleCount((current) =>
      Math.min(
        entries.length,
        Math.max(INITIAL_BATCH_SIZE, current)
      )
    );
  }, [entries.length]);

  const visibleEntries = useMemo(
    () => entries.slice(0, visibleCount),
    [entries, visibleCount]
  );

  const hasMore = visibleCount < entries.length;

  const loadMore = () => {
    if (!hasMore) {
      return;
    }

    setVisibleCount((current) =>
      Math.min(entries.length, current + LOAD_MORE_BATCH_SIZE)
    );
  };

  const handleScroll = () => {
    const container = scrollContainerRef.current;
    if (!container || !hasMore) {
      return;
    }

    const distanceToBottom =
      container.scrollHeight -
      container.scrollTop -
      container.clientHeight;

    if (distanceToBottom <= SCROLL_THRESHOLD_PX) {
      loadMore();
    }
  };

  return (
    <Paper elevation={0} sx={paperSx}>
      <Stack spacing={1.75}>
        <Stack
          direction={{ xs: 'column', sm: 'row' }}
          spacing={1.25}
          sx={{
            justifyContent: 'space-between',
            alignItems: { xs: 'flex-start', sm: 'center' },
          }}
        >
          <Box>
            <Typography variant="h6" sx={{ fontWeight: 700 }}>
              Recent Work
            </Typography>
          </Box>

          <Button
            variant="outlined"
            size="small"
            startIcon={<AddRoundedIcon fontSize="small" />}
            onClick={onAddManualEntry}
            sx={{ borderRadius: 2.5 }}
          >
            Manual Entry
          </Button>
        </Stack>

        <Box
          ref={scrollContainerRef}
          onScroll={handleScroll}
          sx={(theme) => scrollContainerSx(theme)}
        >
          <Stack spacing={1}>
            {visibleEntries.map((entry) => (
              <Stack
                key={entry.id}
                direction={{ xs: 'column', md: 'row' }}
                spacing={1.25}
                sx={(theme) => ({
                  ...rowSx(theme),
                  justifyContent: 'space-between',
                  alignItems: { xs: 'flex-start', md: 'center' },
                })}
              >
                <Box>
                  <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                    {entry.task}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {entry.project}
                  </Typography>
                  <Stack
                    direction={{ xs: 'column', sm: 'row' }}
                    spacing={{ xs: 0.55, sm: 1.35 }}
                    sx={{
                      mt: 1,
                      alignItems: { xs: 'flex-start', sm: 'center' },
                      flexWrap: 'wrap',
                    }}
                  >
                    <Typography variant="caption" color="text.secondary">
                      {entry.billable ? 'Billable' : 'Internal'}
                    </Typography>
                    {entry.description ? (
                      <Typography variant="caption" color="text.secondary">
                        {entry.description}
                      </Typography>
                    ) : null}
                  </Stack>
                </Box>

                <Stack
                  direction={{ xs: 'column', sm: 'row' }}
                  spacing={{ xs: 0.5, sm: 2 }}
                  sx={{ alignItems: { xs: 'flex-start', sm: 'center' } }}
                >
                  <Button
                    variant="text"
                    size="small"
                    startIcon={<EditRoundedIcon fontSize="small" />}
                    disabled={entry.status !== 'stopped'}
                    onClick={() => onEditEntry(entry.id)}
                    sx={{ minWidth: 0, px: 0.5 }}
                  >
                    Edit
                  </Button>
                  <Typography variant="body2" color="text.secondary">
                    {formatRange(entry.startTime, entry.endTime)}
                  </Typography>
                  <Typography
                    variant="subtitle2"
                    sx={{
                      fontWeight: 700,
                      fontVariantNumeric: 'tabular-nums',
                    }}
                  >
                    {formatDuration(entry.durationSeconds)}
                  </Typography>
                </Stack>
              </Stack>
            ))}

            {entries.length === 0 ? (
              <Box sx={{ py: 5, textAlign: 'center' }}>
                <Typography variant="body2" color="text.secondary">
                  No recent work yet.
                </Typography>
              </Box>
            ) : null}

            {!hasMore && entries.length > INITIAL_BATCH_SIZE ? (
              <Box sx={{ py: 1.25, textAlign: 'center' }}>
                <Typography variant="caption" color="text.secondary">
                  Showing all {entries.length} sessions
                </Typography>
              </Box>
            ) : null}
          </Stack>
        </Box>
      </Stack>
    </Paper>
  );
};

export default RecentWorkList;