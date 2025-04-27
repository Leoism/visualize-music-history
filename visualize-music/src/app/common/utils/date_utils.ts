import { format, DateArg, startOfWeek } from 'date-fns';

/** Formats a Date object into 'yyyy-MM-dd' string */
export function formatDateKey(date: DateArg<Date>): string | undefined {
  return date ? format(date, 'yyyy-MM-dd') : undefined;
}

export function getWeekStartDate(date: DateArg<Date>): Date {
  return startOfWeek(date, { weekStartsOn: 0 });
}
