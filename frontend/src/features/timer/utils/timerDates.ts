export const formatLocalDateKey = (value: Date) => {
  const year = value.getFullYear();
  const month = `${value.getMonth() + 1}`.padStart(2, '0');
  const day = `${value.getDate()}`.padStart(2, '0');

  return `${year}-${month}-${day}`;
};

export const formatLocalTimeKey = (value: Date) =>
  value.toLocaleTimeString('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });

export const parseLocalDateKey = (value: string) => {
  const [year, month, day] = value.split('-').map(Number);
  return new Date(year, month - 1, day);
};

export const getLocalDateKeyFromTimestamp = (timestamp: string) =>
  formatLocalDateKey(new Date(timestamp));

export const getLocalTimeKeyFromTimestamp = (timestamp: string) =>
  formatLocalTimeKey(new Date(timestamp));

export const formatRelativeDateLabel = (
  value: string,
  now: Date = new Date()
) => {
  const date = parseLocalDateKey(value);
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);

  const targetKey = date.toDateString();
  if (targetKey === today.toDateString()) {
    return 'Today';
  }

  if (targetKey === yesterday.toDateString()) {
    return 'Yesterday';
  }

  return date.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
  });
};
