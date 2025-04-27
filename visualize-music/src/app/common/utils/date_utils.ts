import { format, DateArg } from 'date-fns';

/** Formats a Date object into 'yyyy-MM-dd' string */
export function formatDateKey(date: DateArg<Date>): string | undefined {
  return date ? format(date, 'yyyy-MM-dd') : undefined;
}
