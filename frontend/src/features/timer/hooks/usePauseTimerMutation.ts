import { useMutation, useQueryClient } from '@tanstack/react-query';

import { timerApi } from '@/features/timer/api';
import { timerKeys } from '@/features/timer/hooks/useTimerContextQuery';

export const usePauseTimerMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => timerApi.pauseTimer(),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: timerKeys.currentTimer(),
      });
      await queryClient.invalidateQueries({
        queryKey: timerKeys.context(),
      });
    },
  });
};
