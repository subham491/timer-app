import { useQuery } from '@tanstack/react-query';

import { timerApi } from '@/features/timer/api';

import { timerKeys } from './useTimerContextQuery';

export const useTimeEntriesQuery = () =>
  useQuery({
    queryKey: timerKeys.timeEntries(),
    queryFn: () =>
      timerApi.listTimeEntries({
        page: 1,
        pageSize: 100,
        sortBy: 'startAt',
        sortOrder: 'desc',
        status: ['stopped'],
      }),
  });
