/** Defines the possible units or modes for the ranking calculation window */
export type RankingWindowUnit = 'weeks' | 'months' | 'years' | 'all-time';

/** Represents the user-configurable settings for the application */
export interface Settings {
  /** The numeric duration for the ranking window (ignored if unit is 'all-time') */
  windowDuration: number;

  /** The unit of time for the ranking window, or 'all-time' mode */
  windowUnit: RankingWindowUnit;

  /** The number of items (tracks/artists) to include in the exported image */
  exportCount: number;

  /** Derived flag indicating if the 'all-time' mode is selected (based on windowUnit) */
  isAllTimeMode: boolean;

  slidingWindowWeeks: number;
}
