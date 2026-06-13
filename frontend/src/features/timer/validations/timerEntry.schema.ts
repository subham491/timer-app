import { z } from 'zod';

import type { TimerDraft } from '@/store/slices/timer/timer.types';

const requiredMessage = 'Required';

export type TimerDraftFieldErrors = Partial<
  Record<keyof TimerDraft, string>
>;

const toDateTime = (date: string, time: string) =>
  new Date(`${date}T${time}:00`);

export const timerEntrySchema = z
  .object({
    description: z.string(),
    project: z.string().trim().min(1, requiredMessage),
    task: z.string().trim().min(1, requiredMessage),
    billable: z.boolean(),
    startDate: z.string().min(1, requiredMessage),
    startTime: z.string().min(1, requiredMessage),
    endDate: z.string().min(1, requiredMessage),
    endTime: z.string().min(1, requiredMessage),
  })
  .superRefine((draft, context) => {
    const start = toDateTime(draft.startDate, draft.startTime);
    const end = toDateTime(draft.endDate, draft.endTime);

    if (end.getTime() >= start.getTime()) {
      return;
    }

    context.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'End time must be after start time',
      path: ['endTime'],
    });
  });

export const validateTimerDraft = (
  draft: TimerDraft
): TimerDraftFieldErrors => {
  const parsedDraft = timerEntrySchema.safeParse(draft);

  if (parsedDraft.success) {
    return {};
  }

  const flattenedErrors = parsedDraft.error.flatten().fieldErrors;

  return Object.entries(flattenedErrors).reduce<
    TimerDraftFieldErrors
  >((errors, [field, messages]) => {
    if (!messages?.[0]) {
      return errors;
    }

    return {
      ...errors,
      [field]: messages[0],
    };
  }, {});
};
