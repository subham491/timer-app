import { useMutation, useQueryClient } from '@tanstack/react-query';

import { timerApi } from '@/features/timer/api';
import type { StartTimerRequest } from '@/features/timer/types';
import { timerKeys } from '@/features/timer/hooks/useTimerContextQuery';

export const useStartTimerMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: StartTimerRequest) =>
      timerApi.startTimer(payload),
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
