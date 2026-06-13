import { useQuery } from '@tanstack/react-query';

import { timerApi } from '@/features/timer/api';

export const timerKeys = {
  all: ['timer'] as const,
  context: () => [...timerKeys.all, 'context'] as const,
  currentTimer: () => [...timerKeys.all, 'current-timer'] as const,
  timeEntries: () => [...timerKeys.all, 'time-entries'] as const,
};

export const useTimerContextQuery = () =>
  useQuery({
    queryKey: timerKeys.context(),
    queryFn: () => timerApi.getTimerContext(),
  });
