import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect } from 'react';
import {
  useForm,
  type Control,
  type FieldErrors,
  type UseFormHandleSubmit,
} from 'react-hook-form';

import type { EntryMode } from '@/features/timer/types';
import { timerEntrySchema } from '@/features/timer/validations';
import type {
  TimerDraft,
  TimerEntry,
} from '@/store/slices/timer/timer.types';

interface UseTimerEntryFormParams {
  activeEntry: TimerEntry | null;
  draft: TimerDraft;
  onCancelEdit: () => void;
  onClearDraft: () => void;
  onModeChange: (mode: EntryMode) => void;
  onSaveManualEntry: () => void;
  onStartOrStopTimer: () => void;
  onUpdateEntry: () => void;
}

interface UseTimerEntryFormResult {
  control: Control<TimerDraft>;
  errors: FieldErrors<TimerDraft>;
  handleCancelEdit: () => void;
  handleEntryUpdate: () => void;
  handleManualSave: () => void;
  handleModeChange: (mode: EntryMode) => void;
  handleReset: () => void;
  handleTimerAction: () => void;
  handleSubmit: UseFormHandleSubmit<TimerDraft>;
}

export const useTimerEntryForm = ({
  activeEntry,
  draft,
  onCancelEdit,
  onClearDraft,
  onModeChange,
  onSaveManualEntry,
  onStartOrStopTimer,
  onUpdateEntry,
}: UseTimerEntryFormParams): UseTimerEntryFormResult => {
  const {
    clearErrors,
    control,
    formState: { errors },
    handleSubmit,
    reset,
  } = useForm<TimerDraft>({
    defaultValues: draft,
    resolver: zodResolver(timerEntrySchema),
  });

  useEffect(() => {
    reset(draft);
  }, [draft, reset]);

  const handleModeChange = (mode: EntryMode) => {
    clearErrors();
    onModeChange(mode);
  };

  const handleReset = () => {
    clearErrors();
    onClearDraft();
  };

  const handleCancelEdit = () => {
    clearErrors();
    onCancelEdit();
  };

  return {
    control,
    errors,
    handleCancelEdit,
    handleEntryUpdate: handleSubmit(() => onUpdateEntry()),
    handleManualSave: handleSubmit(() => onSaveManualEntry()),
    handleModeChange,
    handleReset,
    handleSubmit,
    handleTimerAction: activeEntry
      ? onStartOrStopTimer
      : handleSubmit(() => onStartOrStopTimer()),
  };
};
