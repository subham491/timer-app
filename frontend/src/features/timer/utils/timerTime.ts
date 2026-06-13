import type { TimerEntry } from '@/store/slices/timer/timer.types';

export const formatDuration = (totalSeconds: number) => {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  return [hours, minutes, seconds]
    .map((value) => value.toString().padStart(2, '0'))
    .join(':');
};

export const formatCompactDuration = (totalSeconds: number) => {
  const safeSeconds = Math.max(totalSeconds, 0);
  const hours = Math.floor(safeSeconds / 3600);
  const minutes = Math.floor((safeSeconds % 3600) / 60);

  if (hours > 0) {
    return `${hours}h ${minutes.toString().padStart(2, '0')}m`;
  }

  return `${minutes}m`;
};

export const toDateTime = (date: string, time: string) =>
  new Date(`${date}T${time}:00`);

const toNowMs = (now: number | Date) =>
  typeof now === 'number' ? now : now.getTime();

export const getTimerElapsedSeconds = (
  entry: TimerEntry,
  now: number | Date
) =>
  Math.max(
    entry.durationSeconds +
      (entry.status === 'running' && entry.runningStartedAt
        ? Math.floor(
            (toNowMs(now) -
              new Date(entry.runningStartedAt).getTime()) /
              1000
          )
        : 0),
    0
  );

export const getElapsedDurationSeconds = getTimerElapsedSeconds;
