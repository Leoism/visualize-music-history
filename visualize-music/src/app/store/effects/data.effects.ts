// src/app/store/effects/data.effects.ts
import { Injectable } from '@angular/core';
import { act, Actions, createEffect, ofType } from '@ngrx/effects';
import { from, of, Observable, combineLatest } from 'rxjs';
import {
  map,
  catchError,
  switchMap,
  tap,
  withLatestFrom,
  filter,
} from 'rxjs/operators';
import * as DataActions from '../actions/data.actions';
// import * as Papa from 'papaparse'; // Not used directly
import {
  ArtistData,
  EntityKey,
  HistoryEntry,
  HistoryGroupedByWeek,
  HistoryGroupedByYear,
  PeakStatus,
  ProcessedArtistData,
  ProcessedData,
  ProcessedTrackData,
  RankStatus,
  RawDataEntry,
  TrackData,
  // BaseChartEntityData, // No longer needed
} from '../../common/interfaces/data.interfaces';
import { Store } from '@ngrx/store';
import { AppState } from '../state/app.state';
import { selectRawData } from '../selectors/file_upload.selectors';
import { selectSettings } from '../selectors/settings.selectors';
import { Settings } from '../../common/interfaces/settings.interface';
import { formatDateKey, getWeekStartDate } from '../../common/utils/date_utils';
import {
  COMPOSITE_KEY_SEPARATOR,
  DEFAULT_PEAK_VALUE,
  MAX_LIST_ITEMS,
} from '../../common/utils/constants';
import {
  compareAsc,
  fromUnixTime,
  isSameDay,
  parseISO,
  subWeeks,
  formatISO,
  getYear,
} from 'date-fns';
import { Router } from '@angular/router';
import { applySettings } from '../actions/settings.actions';

type HistoryCalculableEntity = TrackData | ArtistData;

@Injectable()
export class DataEffects {
  constructor(
    private actions$: Actions,
    private store: Store<AppState>,
    private router: Router
  ) {}

  processDataStart$ = createEffect(() =>
    this.actions$.pipe(
      ofType(DataActions.processDataStart, applySettings),
      withLatestFrom(
        this.store.select(selectRawData),
        this.store.select(selectSettings)
      ),
      switchMap(([action, rawData, settings]) => {
        if (!rawData) {
          return of(
            DataActions.processDataFailure({
              error: 'No raw data available for processing.',
            })
          );
        }
        return from(this.processRawData(rawData, settings)).pipe(
          map((processedData) =>
            DataActions.processDataSuccess({ processedData })
          ),
          catchError((error) => {
            const errorMessage =
              error instanceof Error ? error.message : String(error);
            return of(DataActions.processDataFailure({ error: errorMessage }));
          })
        );
      })
    )
  );

  processDataSuccess$ = createEffect(
    () =>
      this.actions$.pipe(
        ofType(DataActions.processDataSuccess),
        tap(() => this.router.navigate(['/charts']))
      ),
    { dispatch: false }
  );

  private processRawData(
    rawData: RawDataEntry[],
    settings: Settings
  ): Observable<ProcessedData> {
    return from(
      new Promise<ProcessedData>((resolve, reject) => {
        try {
          const processedData = this.processListeningData(rawData, settings);
          resolve(processedData);
        } catch (error) {
          reject(
            new Error(
              'Error during post-parse processing:' +
                (error instanceof Error ? error.message : String(error))
            )
          );
        }
      })
    );
  }

  private processListeningData(
    rawData: RawDataEntry[],
    settings: Settings
  ): ProcessedData {
    const processedData: ProcessedData = {
      tracks: new Map(),
      artists: new Map(),
      allWeeks: [],
      rawData,
    };
    console.log(`Processing listening data...`);
    const overallStartTime = performance.now();

    // 1. Aggregation
    const step1StartTime = performance.now();
    const { weeklyCounts, entityDetails } = this.aggregateWeeklyCounts(rawData);
    const step1EndTime = performance.now();
    console.log(
      `Step 1 (Aggregation) took: ${step1EndTime - step1StartTime} ms`
    );

    // 2. Get and sort weeks
    const allWeeks = Array.from(weeklyCounts.keys())
      .map((weekKey) => parseISO(weekKey))
      .sort(compareAsc);
    if (allWeeks.length === 0) {
      return processedData;
    }
    processedData.allWeeks = allWeeks;

    // 3. Calculate ranks
    const step2StartTime = performance.now();
    const { tempTrackHistory, tempArtistHistory } =
      this.calculateRanksOptimized(allWeeks, weeklyCounts, settings);
    const step2EndTime = performance.now();
    console.log(`Step 2 (Ranking) took: ${step2EndTime - step2StartTime} ms`);

    // 4. Calculate history stats using the generic function
    const step3StartTime = performance.now();

    processedData.tracks = this.calculateHistoryStatsGeneric(
      tempTrackHistory,
      entityDetails.tracks
    ) as Map<EntityKey, ProcessedTrackData>;

    processedData.artists = this.calculateHistoryStatsGeneric(
      tempArtistHistory,
      entityDetails.artists
    ) as Map<EntityKey, ProcessedArtistData>;

    const step3EndTime = performance.now();
    console.log(
      `Step 3 (History Stats) took: ${step3EndTime - step3StartTime} ms`
    );

    const overallEndTime = performance.now();
    console.log(
      `Total data processing finished in ${overallEndTime - overallStartTime} ms.`
    );
    return processedData;
  }

  private aggregateWeeklyCounts(rawData: RawDataEntry[]) {
    const weeklyCounts: Map<
      string,
      {
        trackCounts: Map<EntityKey, number>;
        artistCounts: Map<EntityKey, number>;
      }
    > = new Map();
    const entityDetails: {
      tracks: Map<EntityKey, TrackData>;
      artists: Map<EntityKey, ArtistData>;
    } = { tracks: new Map(), artists: new Map() };

    for (const listen of rawData) {
      if (typeof listen.uts !== 'number' || isNaN(listen.uts)) continue;
      const trackName = (listen.track || '').trim();
      const artistName = (listen.artist || '').trim();
      if (!trackName || !artistName) continue;
      const listenDate = fromUnixTime(listen.uts);
      const weekStartDate = getWeekStartDate(listenDate);
      const weekKey = formatDateKey(weekStartDate);
      if (!weekKey) continue;
      const trackMbid = (listen.track_mbid || '').trim();
      const artistMbid = (listen.artist_mbid || '').trim();
      const albumMbid = (listen.album_mbid || '').trim();
      const artistKey = artistMbid || artistName;
      const trackKey =
        trackMbid || `${artistKey}${COMPOSITE_KEY_SEPARATOR}${trackName}`;

      let weekData = weeklyCounts.get(weekKey);
      if (!weekData) {
        weekData = { trackCounts: new Map(), artistCounts: new Map() };
        weeklyCounts.set(weekKey, weekData);
      }
      weekData.trackCounts.set(
        trackKey,
        (weekData.trackCounts.get(trackKey) ?? 0) + 1
      );
      weekData.artistCounts.set(
        artistKey,
        (weekData.artistCounts.get(artistKey) ?? 0) + 1
      );

      this.updateTrackDetailsInternal(
        entityDetails.tracks,
        trackKey,
        listenDate,
        { trackName, artistName, albumMbid, artistMbid: artistKey, trackMbid }
      );
      this.updateArtistDetailsInternal(
        entityDetails.artists,
        artistKey,
        listenDate,
        { artistName, artistMbid }
      );
    }
    return { weeklyCounts, entityDetails };
  }
  private updateTrackDetailsInternal(
    detailMap: Map<EntityKey, TrackData>,
    key: EntityKey,
    listenDate: Date,
    newData: {
      trackName: string;
      artistName: string;
      albumMbid: string | null;
      artistMbid: EntityKey | null;
      trackMbid: string | null;
    }
  ) {
    let detail = detailMap.get(key);

    if (!detail) {
      detail = {
        trackName: newData.trackName,
        artistName: newData.artistName,
        albumMbid: newData.albumMbid || null,
        artistMbid: newData.artistMbid || null,
        trackMbid: newData.trackMbid || null,
        // Base fields
        totalPlays: 0,
        firstPlayDate: listenDate,
        lastPlayDate: listenDate,
        peakedAt: null,
        peakDate: null,
        history: [],
      };
      detailMap.set(key, detail);
    }

    detail.totalPlays += 1;
    if (compareAsc(listenDate, detail.firstPlayDate ?? listenDate) < 0) {
      detail.firstPlayDate = listenDate;
    }
    if (compareAsc(listenDate, detail.lastPlayDate ?? listenDate) > 0) {
      detail.lastPlayDate = listenDate;
    }

    // Backfill missing details (preferring first non-empty value encountered)
    if (!detail.trackName && newData.trackName)
      detail.trackName = newData.trackName;
    if (!detail.artistName && newData.artistName)
      detail.artistName = newData.artistName;
    if (!detail.albumMbid && newData.albumMbid)
      detail.albumMbid = newData.albumMbid;
    if (!detail.artistMbid && newData.artistMbid)
      detail.artistMbid = newData.artistMbid;
    if (!detail.trackMbid && newData.trackMbid)
      detail.trackMbid = newData.trackMbid;
  }

  private updateArtistDetailsInternal(
    detailMap: Map<EntityKey, ArtistData>,
    key: EntityKey,
    listenDate: Date,
    newData: { artistName: string; artistMbid: string | null }
  ) {
    let detail = detailMap.get(key);

    if (!detail) {
      detail = {
        artistName: newData.artistName,
        artistMbid: newData.artistMbid || null,
        // Base fields
        totalPlays: 0,
        firstPlayDate: listenDate,
        lastPlayDate: listenDate,
        peakedAt: null,
        peakDate: null,
        history: [],
      };
      detailMap.set(key, detail);
    }

    detail.totalPlays += 1;
    if (compareAsc(listenDate, detail.firstPlayDate ?? listenDate) < 0) {
      detail.firstPlayDate = listenDate;
    }
    if (compareAsc(listenDate, detail.lastPlayDate ?? listenDate) > 0) {
      detail.lastPlayDate = listenDate;
    }

    if (!detail.artistName && newData.artistName)
      detail.artistName = newData.artistName;
    if (!detail.artistMbid && newData.artistMbid)
      detail.artistMbid = newData.artistMbid;
  }

  private calculateRanksOptimized(
    allWeeks: Date[], // Assumed sorted chronologically
    weeklyCounts: Map<
      string, // weekKey 'YYYY-MM-DD'
      {
        trackCounts: Map<EntityKey, number>;
        artistCounts: Map<EntityKey, number>;
      }
    >,
    settings: Settings // Expects settings.rankingMode
  ) {
    const tempTrackHistory: Map<
      EntityKey,
      Array<{ week: Date; rank: number; playsInWindow: number }> // playsInWindow = plays used for ranking in the specific mode
    > = new Map();
    const tempArtistHistory: Map<
      EntityKey,
      Array<{ week: Date; rank: number; playsInWindow: number }>
    > = new Map();

    // --- State variables for different modes ---
    // Sliding Window
    const windowTrackPlays: Map<EntityKey, number> = new Map();
    const windowArtistPlays: Map<EntityKey, number> = new Map();
    // All-Time
    const cumulativeTrackPlays: Map<EntityKey, number> = new Map();
    const cumulativeArtistPlays: Map<EntityKey, number> = new Map();
    // Year-to-Date
    const ytdTrackPlays: Map<EntityKey, number> = new Map();
    const ytdArtistPlays: Map<EntityKey, number> = new Map();
    let previousYear: number | null = null; // Tracks year changes for YTD reset

    // --- Iterate through each week ---
    allWeeks.forEach((currentWeekDate, weekIndex) => {
      const currentWeekKey = formatDateKey(currentWeekDate);
      if (!currentWeekKey) {
        console.warn(
          `Skipping week with invalid key for date: ${currentWeekDate}`
        );
        return; // Skip if key formatting fails
      }

      // Get this week's raw counts
      const currentWeekData = weeklyCounts.get(currentWeekKey);
      const currentTrackCounts = currentWeekData?.trackCounts ?? new Map();
      const currentArtistCounts = currentWeekData?.artistCounts ?? new Map();

      // References to the maps used for ranking this week
      let rankedTracksSource: Map<EntityKey, number>;
      let rankedArtistsSource: Map<EntityKey, number>;

      // --- Determine ranking logic based on settings.rankingMode ---
      switch (settings.windowUnit) {
        case 'all-time':
          // --- All-Time Calculation ---
          currentTrackCounts.forEach((count, key) =>
            cumulativeTrackPlays.set(
              key,
              (cumulativeTrackPlays.get(key) ?? 0) + count
            )
          );
          currentArtistCounts.forEach((count, key) =>
            cumulativeArtistPlays.set(
              key,
              (cumulativeArtistPlays.get(key) ?? 0) + count
            )
          );
          // Rank based on the grand total up to this week
          rankedTracksSource = cumulativeTrackPlays;
          rankedArtistsSource = cumulativeArtistPlays;
          break;

        case 'year-to-date':
          // --- Year-to-Date Calculation ---
          const currentYear = getYear(currentWeekDate);

          // Check if the year has changed since the last iteration
          if (currentYear !== previousYear) {
            // Reset YTD accumulators when crossing into a new year
            ytdTrackPlays.clear();
            ytdArtistPlays.clear();
            previousYear = currentYear; // Update the tracked year
            // console.log(`YTD: Resetting counts for year ${currentYear}`); // Optional debug log
          }

          // Add this week's counts to the current year's YTD totals
          currentTrackCounts.forEach((count, key) =>
            ytdTrackPlays.set(key, (ytdTrackPlays.get(key) ?? 0) + count)
          );
          currentArtistCounts.forEach((count, key) =>
            ytdArtistPlays.set(key, (ytdArtistPlays.get(key) ?? 0) + count)
          );
          // Rank based on the YTD total up to this week within the current year
          rankedTracksSource = ytdTrackPlays;
          rankedArtistsSource = ytdArtistPlays;
          break;

        case 'years':
        case 'months':
        case 'weeks':
        default: // Default to sliding window if mode is unset or invalid
          // --- Sliding Window Calculation (Optimized version) ---
          currentTrackCounts.forEach((count, key) =>
            windowTrackPlays.set(key, (windowTrackPlays.get(key) ?? 0) + count)
          );
          currentArtistCounts.forEach((count, key) =>
            windowArtistPlays.set(
              key,
              (windowArtistPlays.get(key) ?? 0) + count
            )
          );

          const windowSize = settings.slidingWindowWeeks ?? 1; // Use setting, default 1
          if (weekIndex >= windowSize) {
            // Subtract counts from the week leaving the window
            const leavingWeekDate = allWeeks[weekIndex - windowSize];
            const leavingWeekKey = formatDateKey(leavingWeekDate);
            const leavingWeekData = leavingWeekKey
              ? weeklyCounts.get(leavingWeekKey)
              : undefined;

            if (leavingWeekData?.trackCounts) {
              leavingWeekData.trackCounts.forEach((count, key) => {
                const newPlays = (windowTrackPlays.get(key) ?? 0) - count;
                if (newPlays > 0) windowTrackPlays.set(key, newPlays);
                else windowTrackPlays.delete(key); // Remove if zero or less
              });
            }
            if (leavingWeekData?.artistCounts) {
              leavingWeekData.artistCounts.forEach((count, key) => {
                const newPlays = (windowArtistPlays.get(key) ?? 0) - count;
                if (newPlays > 0) windowArtistPlays.set(key, newPlays);
                else windowArtistPlays.delete(key); // Remove if zero or less
              });
            }
          }
          // Rank based on the current window's totals
          rankedTracksSource = windowTrackPlays;
          rankedArtistsSource = windowArtistPlays;
          break;
      }

      // --- Rank and Store Results (Common logic for all modes) ---
      const rankedTracks = Array.from(rankedTracksSource.entries())
        .sort(([, playsA], [, playsB]) => playsB - playsA) // Sort descending by plays
        .slice(0, MAX_LIST_ITEMS); // Take top N

      rankedTracks.forEach(([key, playsInWindow], index) => {
        if (!tempTrackHistory.has(key)) tempTrackHistory.set(key, []);
        tempTrackHistory.get(key)!.push({
          week: currentWeekDate,
          rank: index + 1,
          playsInWindow: playsInWindow, // Store the play count used for ranking
        });
      });

      const rankedArtists = Array.from(rankedArtistsSource.entries())
        .sort(([, playsA], [, playsB]) => playsB - playsA)
        .slice(0, MAX_LIST_ITEMS);

      rankedArtists.forEach(([key, playsInWindow], index) => {
        if (!tempArtistHistory.has(key)) tempArtistHistory.set(key, []);
        tempArtistHistory.get(key)!.push({
          week: currentWeekDate,
          rank: index + 1,
          playsInWindow: playsInWindow,
        });
      });
    }); // End of allWeeks.forEach

    return { tempTrackHistory, tempArtistHistory };
  }

  private calculateHistoryStatsGeneric<T extends HistoryCalculableEntity>(
    tempHistoryMap: Map<
      EntityKey,
      Array<{ week: Date; rank: number; playsInWindow: number }>
    >,
    detailsMap: Map<EntityKey, T>
  ): Map<EntityKey, { details: T; history: HistoryGroupedByYear }> {
    const finalDataMap: Map<
      EntityKey,
      { details: T; history: HistoryGroupedByYear }
    > = new Map();

    tempHistoryMap.forEach((rawHistory, key) => {
      const details = detailsMap.get(key);
      if (!details) {
        console.warn(
          `No details found for key during history calculation: ${key}. Skipping.`
        );
        return;
      }

      rawHistory.sort((a, b) => compareAsc(a.week, b.week));

      const enrichedHistory: HistoryGroupedByYear = {
        years: new Map(),
      };
      let overallPeakPosition = DEFAULT_PEAK_VALUE;
      let overallPeakDate: Date | null = null;

      for (let i = 0; i < rawHistory.length; i++) {
        const currentEntry = rawHistory[i];
        const currentRank = currentEntry.rank;
        let prevHistoryEntry: {
          week: Date;
          rank: number;
          playsInWindow: number;
        } | null = null;

        if (i > 0) {
          const potentialPrevWeekDate = subWeeks(currentEntry.week, 1);
          if (isSameDay(rawHistory[i - 1].week, potentialPrevWeekDate)) {
            prevHistoryEntry = rawHistory[i - 1];
          }
        }
        const lastWeekRank = prevHistoryEntry ? prevHistoryEntry.rank : null;
        const lastWeekPlays = prevHistoryEntry
          ? prevHistoryEntry.playsInWindow
          : null;

        let peakStatus: PeakStatus = null;
        if (currentRank < overallPeakPosition) {
          overallPeakPosition = currentRank;
          overallPeakDate = currentEntry.week;
          peakStatus = 'PEAK';
        } else if (currentRank === overallPeakPosition) {
          if (lastWeekRank !== null && currentRank < lastWeekRank) {
            peakStatus = 'RE-PEAK';
          }
          if (overallPeakDate === null) {
            overallPeakDate = currentEntry.week;
          }
        }

        let status: RankStatus;
        if (lastWeekRank !== null) {
          status = lastWeekRank - currentRank;
        } else {
          status = i === 0 ? 'NEW' : 'RE-ENTRY';
        }

        let playPercentChange = 0;
        if (lastWeekPlays !== null && lastWeekPlays > 0) {
          playPercentChange =
            ((currentEntry.playsInWindow - lastWeekPlays) / lastWeekPlays) *
            100;
        } else if (lastWeekPlays === 0 && currentEntry.playsInWindow > 0) {
          playPercentChange = Infinity;
        } else if (lastWeekPlays === null && currentEntry.playsInWindow > 0) {
          playPercentChange = Infinity;
        }
        const year = getYear(currentEntry.week);
        const weekKey = formatDateKey(currentEntry.week);
        if (enrichedHistory.years.get(year) === undefined) {
          enrichedHistory.years.set(year, {
            weeks: new Map<string, HistoryEntry>(),
          });
        }
        if (!weekKey) {
          continue;
        }
        enrichedHistory.years.get(year)!.weeks.set(weekKey, {
          week: currentEntry.week,
          rank: currentRank,
          playsInWindow: currentEntry.playsInWindow,
          status: status,
          peakPosition:
            overallPeakPosition <= MAX_LIST_ITEMS ? overallPeakPosition : null,
          peakStatus: peakStatus,
          weeksOnChart: i + 1,
          playPercentChange: playPercentChange,
          lastWeekRank: lastWeekRank,
        });
      }

      details.peakedAt =
        overallPeakPosition <= MAX_LIST_ITEMS ? overallPeakPosition : null;
      details.peakDate = overallPeakDate;

      finalDataMap.set(key, { details, history: enrichedHistory });
    });

    return finalDataMap;
  }
}
