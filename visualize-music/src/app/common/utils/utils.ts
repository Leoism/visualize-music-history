import { RankingWindowUnit } from '../interfaces/settings.interface';

export function craftKey(entityType: string, key: string): string {
  return `${entityType}::${key}`;
}

export function calculateDaysFromUnitDuration(
  windowUnit: RankingWindowUnit,
  windowSize: number
): number | 'all-time' | 'year-to-date' {
  let sizeInDays = 0;
  const daysInWeek = 7;
  const weeksInMonth = 4.345;
  const monthsInYear = 12;
  if (windowUnit === 'weeks') {
    sizeInDays = windowSize * daysInWeek;
  } else if (windowUnit === 'months') {
    sizeInDays = Math.floor(windowSize * weeksInMonth * daysInWeek);
  } else if (windowUnit === 'years') {
    sizeInDays = Math.floor(
      windowSize * monthsInYear * weeksInMonth * daysInWeek
    );
  } else if (windowUnit === 'all-time') {
    return 'all-time';
  } else if (windowUnit === 'year-to-date') {
    return 'year-to-date';
  }

  return sizeInDays;
}
