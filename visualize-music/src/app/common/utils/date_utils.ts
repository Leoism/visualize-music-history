import { format, DateArg } from 'date-fns';

/** Formats a Date object into 'yyyy-MM-dd' string */
export function formatDateKey(date: DateArg<Date>): string | null {
  return date ? format(date, 'yyyy-MM-dd') : null;
}
