import { useMutation, useQueryClient } from '@tanstack/react-query';

import { timerApi } from '@/features/timer/api';
import { timerKeys } from '@/features/timer/hooks/useTimerContextQuery';

export const useStopTimerMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload?: {
      billable?: boolean;
      isBillable?: boolean;
      notes?: string;
      workNote?: string;
    }) => timerApi.stopTimer(payload),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: timerKeys.currentTimer(),
      });
      await queryClient.invalidateQueries({
        queryKey: timerKeys.context(),
      });
      await queryClient.invalidateQueries({
        queryKey: timerKeys.timeEntries(),
      });
    },
  });
};
