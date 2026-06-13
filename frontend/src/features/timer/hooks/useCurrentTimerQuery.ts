import { useEffect } from 'react';

import { useQuery } from '@tanstack/react-query';

import { timerApi } from '@/features/timer/api';
import { useAppDispatch } from '@/store/hooks';
import {
  clearSynchronizedActiveTimer,
  hydratePausedTimer,
  hydrateStartedTimer,
} from '@/store/slices/timer/timerSlice';

import { timerKeys } from './useTimerContextQuery';

export const useCurrentTimerQuery = () => {
  const dispatch = useAppDispatch();
  const query = useQuery({
    queryKey: timerKeys.currentTimer(),
    queryFn: () => timerApi.getCurrentTimer(),
    refetchInterval: 15000,
    refetchOnReconnect: true,
    refetchOnWindowFocus: true,
  });

  useEffect(() => {
    if (!query.isSuccess) {
      return;
    }

    const currentEntry = query.data.runningEntry;
    const currentStatus = currentEntry?.status as
      | 'paused'
      | 'running'
      | 'stopped'
      | undefined;

    if (!currentEntry || currentStatus === 'stopped') {
      dispatch(clearSynchronizedActiveTimer());
      return;
    }

    if (currentStatus === 'paused') {
      dispatch(hydratePausedTimer(currentEntry));
      return;
    }

    dispatch(hydrateStartedTimer(currentEntry));
  }, [dispatch, query.data, query.isSuccess]);

  return query;
};
