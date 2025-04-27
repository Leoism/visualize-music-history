// src/app/store/effects/data.effects.ts
import { Injectable } from '@angular/core';
import { act, Actions, createEffect, ofType } from '@ngrx/effects';
import { from, of, Observable, combineLatest } from 'rxjs'; // Import from and Observable
import {
  map,
  catchError,
  switchMap,
  tap,
  withLatestFrom,
  filter,
} from 'rxjs/operators';
import * as DataActions from '../actions/data.actions'; // Import your data actions
import * as Papa from 'papaparse'; // Import PapaParse
import {
  ArtistData,
  EntityKey,
  HistoryEntry,
  PeakStatus,
  ProcessedArtistData,
  ProcessedData,
  ProcessedTrackData,
  RankStatus,
  RawDataEntry,
  TrackData,
} from '../../common/interfaces/data.interfaces'; // Import your interface
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
  DateArg,
  fromUnixTime,
  isSameDay,
  parseISO,
  subWeeks,
} from 'date-fns';

@Injectable()
export class DataEffects {
  constructor(private actions$: Actions, private store: Store<AppState>) {}

  processDataStart$ = createEffect(() =>
    this.actions$.pipe(
      ofType(DataActions.processDataStart),
      withLatestFrom(
        this.store.select(selectRawData),
        this.store.select(selectSettings)
      ),
      switchMap(([action, rawData, settings]) => {
        if (!rawData) {
          console.warn(
            '[DataEffects] processDataStart triggered, but rawData is null. Skipping processing.'
          );
          return of(
            DataActions.processDataFailure({
              error: 'No raw data available for processing.',
            })
          );
        }

        console.log('[DataEffects] Starting data processing call...');
        return this.processRawData(rawData, settings).pipe(
          map((processedData) => {
            console.log('[DataEffects] Data processing successful.');
            console.log(processedData);
            return DataActions.processDataSuccess({ processedData });
          }),
          catchError((error) => {
            console.error('[DataEffects] Data processing failed:', error);
            const errorMessage =
              error instanceof Error ? error.message : String(error);
            return of(DataActions.processDataFailure({ error: errorMessage }));
          })
        );
      })
    )
  );

  private processRawData(
    rawData: RawDataEntry[],
    settings: Settings
  ): Observable<ProcessedData> {
    return new Observable((observer) => {
      try {
        console.log('Calling processListeningData...');
        const processedData = this.processListeningData(rawData, settings);
        console.log('processListeningData finished.');
        return observer.next(processedData);
      } catch (error) {
        return observer.error(
          new Error('Error during post-parse processing:' + error)
        );
      }
    });
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

    console.log(
      `Processing listening data (Window: ${
        settings.isAllTimeMode
          ? 'All-Time'
          : settings.slidingWindowWeeks + ' weeks'
      })...`
    );
    const startTime = performance.now();

    // 1. Aggregate weekly counts and basic entity details
    const { weeklyCounts, entityDetails } = this.aggregateWeeklyCounts(rawData);
    const step1Time = performance.now();
    console.log(`Step 1 (Aggregation) took: ${step1Time - startTime} ms`);

    // 2. Get sorted list of all unique week start dates
    const allWeeks = Array.from(weeklyCounts.keys())
      .map((weekKeys) => parseISO(weekKeys))
      .sort(compareAsc);
    if (allWeeks.length === 0)
      throw new Error('No valid listening data found after aggregation.');
    processedData.allWeeks = allWeeks;

    // 3. Calculate ranks for each week (Sliding Window or All-Time)
    const { tempTrackHistory, tempArtistHistory } = this.calculateRanks(
      allWeeks,
      weeklyCounts,
      settings
    );
    const step2Time = performance.now();
    console.log(`Step 2 (Ranking) took: ${step2Time - step1Time} ms`);

    // 4. Calculate status, peak position, weeks on chart, etc. and finalize data structure
    const finalTracks = this.calculateHistoryStats(
      tempTrackHistory,
      processedData,
      entityDetails.tracks
    );
    const finalArtists = this.calculateHistoryStats(
      tempArtistHistory,
      processedData,
      entityDetails.artists
    );
    const step3Time = performance.now();
    console.log(`Step 3 (History Stats) took: ${step3Time - step2Time} ms`);

    // Update global state
    processedData.tracks = finalTracks as Map<EntityKey, ProcessedTrackData>;
    processedData.artists = finalArtists as Map<EntityKey, ProcessedArtistData>;

    const endTime = performance.now();
    console.log(`Total data processing finished in ${endTime - startTime} ms.`);
    return processedData;
  }

  private aggregateWeeklyCounts(rawData: RawDataEntry[]) {
    const weeklyCounts: Map<
      string,
      {
        trackCounts: Map<EntityKey, number>;
        artistCounts: Map<EntityKey, number>;
      }
    > = new Map(); // weekKey -> { trackCounts: Map, artistCounts: Map }
    const entityDetails: {
      tracks: Map<EntityKey, TrackData>;
      artists: Map<EntityKey, ArtistData>;
    } = { tracks: new Map(), artists: new Map() }; // key -> { details... }

    rawData.forEach((listen) => {
      // Basic validation
      if (typeof listen.uts !== 'number' || isNaN(listen.uts)) return;
      const trackName = (listen.track || '').trim();
      const artistName = (listen.artist || '').trim();
      if (!trackName || !artistName) return; // Skip entries without track or artist

      const listenDate = fromUnixTime(listen.uts);
      const weekStartDate = getWeekStartDate(listenDate);
      const weekKey = formatDateKey(weekStartDate);

      const trackMbid = (listen.track_mbid || '').trim();
      const artistMbid = (listen.artist_mbid || '').trim();
      const albumMbid = (listen.album_mbid || '').trim();

      // Determine unique keys (prefer MBID, fallback to name/composite)
      const artistKey = artistMbid || artistName;
      const trackKey =
        trackMbid || `${artistKey}${COMPOSITE_KEY_SEPARATOR}${trackName}`;

      // Initialize week if new
      if (weekKey) {
        if (!weeklyCounts.has(weekKey)) {
          weeklyCounts.set(weekKey, {
            trackCounts: new Map(),
            artistCounts: new Map(),
          });
        }
        const weekData = weeklyCounts.get(weekKey);

        // Increment counts
        weekData?.trackCounts.set(
          trackKey,
          (weekData.trackCounts.get(trackKey) || 0) + 1
        );
        weekData?.artistCounts.set(
          artistKey,
          (weekData.artistCounts.get(artistKey) || 0) + 1
        );
      }

      // Update entity details (only store necessary info once)
      this.updateTrackDetails(
        entityDetails.tracks,
        trackKey,
        trackName,
        artistName,
        albumMbid,
        artistKey,
        listenDate
      );
      this.updateArtistDetails(
        entityDetails.artists,
        artistKey,
        null,
        artistName,
        null,
        null,
        listenDate
      );
    });

    return { weeklyCounts, entityDetails };
  }

  /** Helper for aggregateWeeklyCounts - Updates details for a track or artist */
  private updateArtistDetails(
    detailMap: Map<EntityKey, ArtistData>,
    key: EntityKey,
    trackName: string | null,
    artistName: string | null,
    albumMbid: string | null,
    artistKey: EntityKey | null,
    listenDate: Date
  ) {
    this.populateEntityDetails(
      detailMap,
      key,
      trackName,
      artistName,
      albumMbid,
      artistKey,
      listenDate
    );

    let detail = detailMap.get(key);
    if (!detail) {
      this.backfillArtistDetails(detailMap, key, detail!, artistName);
    }
  }

  private updateTrackDetails(
    detailMap: Map<EntityKey, TrackData>,
    key: EntityKey,
    trackName: string | null,
    artistName: string | null,
    albumMbid: string | null,
    artistKey: EntityKey | null,
    listenDate: Date
  ) {
    this.populateEntityDetails(
      detailMap,
      key,
      trackName,
      artistName,
      albumMbid,
      artistKey,
      listenDate
    );

    let detail = detailMap.get(key);
    if (!detail) {
      this.backfillTrackDetails(
        detailMap,
        key,
        detail!,
        trackName,
        albumMbid,
        artistKey,
        artistName
      );
    }
  }

  private backfillTrackDetails(
    detailMap: Map<EntityKey, TrackData>,
    key: EntityKey,
    detail: TrackData,
    trackName: string | null = null,
    albumMbid: string | null = null,
    artistKey: EntityKey | null = null,
    artistName: string | null = null
  ) {
    if (!detail.trackName && trackName) detail.trackName = trackName;
    if (!detail.albumMbid && albumMbid) detail.albumMbid = albumMbid;
    if (!detail.artistKey && artistKey) detail.artistKey = artistKey;
    detailMap.set(key, detail);
    this.backfillArtistDetails(detailMap, key, detail, artistName);
  }

  private backfillArtistDetails(
    detailMap: Map<EntityKey, ArtistData>,
    key: EntityKey,
    detail: ArtistData,
    artistName: string | null = null
  ) {
    if (!detail.artistName && artistName) detail.artistName = artistName;
    detailMap.set(key, detail);
  }

  private populateEntityDetails(
    detailMap: Map<EntityKey, TrackData | ArtistData>,
    key: EntityKey,
    trackName: string | null,
    artistName: string | null,
    albumMbid: string | null,
    artistKey: EntityKey | null,
    listenDate: Date
  ) {
    let detail = detailMap.get(key);

    if (!detail) {
      // Initialize detail object only if it doesn't exist
      detail = {
        trackName: trackName, // Null for artists
        artistName: artistName,
        albumMbid: albumMbid, // Null for artists
        artistKey: artistKey, // Store artist's key on track detail for linking
        totalPlays: 0,
        firstPlayDate: listenDate,
        lastPlayDate: listenDate,
        history: [],
      };
      detailMap.set(key, detail);
    }

    // Update stats regardless of whether it was just created or existed
    detail.totalPlays += 1;
    if (compareAsc(listenDate, detail.firstPlayDate ?? listenDate) < 0) {
      detail.firstPlayDate = listenDate;
    }
    if (compareAsc(listenDate, detail.lastPlayDate ?? listenDate) > 0) {
      detail.lastPlayDate = listenDate;
    }
  }

  /** Step 2: Calculates ranks based on mode (Sliding or All-Time) */
  private calculateRanks(
    allWeeks: Date[],
    weeklyCounts: Map<
      string,
      {
        trackCounts: Map<EntityKey, number>;
        artistCounts: Map<EntityKey, number>;
      }
    >,
    settings: Settings
  ) {
    const tempTrackHistory: Map<
      string,
      Array<{ week: Date; rank: number; playsInWindow: number }>
    > = new Map();
    const tempArtistHistory: Map<
      string,
      Array<{ week: Date; rank: number; playsInWindow: number }>
    > = new Map();
    const cumulativeTrackPlays: Map<string, number> = new Map(); // Used only in all-time mode
    const cumulativeArtistPlays: Map<string, number> = new Map(); // Used only in all-time mode

    allWeeks.forEach((currentWeekDate, weekIndex) => {
      const currentWeekKey = formatDateKey(currentWeekDate);
      if (!currentWeekKey) return; // Skip if no data
      let windowTrackPlays = new Map();
      let windowArtistPlays = new Map();

      if (settings.isAllTimeMode) {
        const currentWeekData = weeklyCounts.get(currentWeekKey);
        if (currentWeekData) {
          currentWeekData.trackCounts.forEach((count, key) => {
            cumulativeTrackPlays.set(
              key,
              (cumulativeTrackPlays.get(key) || 0) + count
            );
          });
          currentWeekData.artistCounts.forEach((count, key) => {
            cumulativeArtistPlays.set(
              key,
              (cumulativeArtistPlays.get(key) || 0) + count
            );
          });
        }
        // Rank based on cumulative totals *up to this week*
        windowTrackPlays = new Map(cumulativeTrackPlays); // Copy map for ranking
        windowArtistPlays = new Map(cumulativeArtistPlays); // Copy map
      } else {
        // --- Sliding Window Calculation ---
        for (let i = 0; i < settings.slidingWindowWeeks; i++) {
          const weekInWindowDate = subWeeks(currentWeekDate, i);
          const weekInWindowKey = formatDateKey(weekInWindowDate);
          if (!weekInWindowKey) continue; // Skip if no data

          if (weeklyCounts.has(weekInWindowKey)) {
            const weekData = weeklyCounts.get(weekInWindowKey);
            if (!weekData) continue; // Skip if no data
            weekData.trackCounts.forEach((count, key) =>
              windowTrackPlays.set(
                key,
                (windowTrackPlays.get(key) || 0) + count
              )
            );
            weekData.artistCounts.forEach((count, key) =>
              windowArtistPlays.set(
                key,
                (windowArtistPlays.get(key) || 0) + count
              )
            );
          }
        }
      }

      // Rank and store history entry for the current week
      const rankedTracks = Array.from(windowTrackPlays.entries())
        .sort(([, playsA], [, playsB]) => playsB - playsA)
        .slice(0, MAX_LIST_ITEMS);

      rankedTracks.forEach(([key, plays], index) => {
        if (!tempTrackHistory.has(key)) tempTrackHistory.set(key, []);
        tempTrackHistory.get(key)?.push({
          week: currentWeekDate,
          rank: index + 1,
          playsInWindow: plays,
        });
      });

      const rankedArtists = Array.from(windowArtistPlays.entries())
        .sort(([, playsA], [, playsB]) => playsB - playsA)
        .slice(0, MAX_LIST_ITEMS);
      rankedArtists.forEach(([key, plays], index) => {
        if (!tempArtistHistory.has(key)) tempArtistHistory.set(key, []);
        tempArtistHistory.get(key)?.push({
          week: currentWeekDate,
          rank: index + 1,
          playsInWindow: plays,
        });
      });
    });

    return { tempTrackHistory, tempArtistHistory };
  }

  /** Step 3: Calculates peak, status, weeks on chart etc. for each entity's history */
  private calculateHistoryStats(
    tempHistoryMap: Map<
      string,
      Array<{ week: Date; rank: number; playsInWindow: number }>
    >,
    processedData: ProcessedData,
    detailsMap: Map<EntityKey, TrackData | ArtistData>
  ): Map<EntityKey, ProcessedTrackData | ProcessedArtistData> {
    const finalDataMap: Map<
      EntityKey,
      ProcessedTrackData | ProcessedArtistData
    > = new Map(); // key -> { ...details, history: [enriched history entries] }

    tempHistoryMap.forEach((history, key) => {
      // Ensure history is sorted chronologically
      history.sort((a, b) => compareAsc(a.week, b.week));

      const enrichedHistory: HistoryEntry[] = [];
      let overallPeakPosition = DEFAULT_PEAK_VALUE; // Start with a value indicating "not peaked yet"

      for (let i = 0; i < history.length; i++) {
        const currentEntry = history[i];
        const prevWeekDate = subWeeks(currentEntry.week, 1);

        // Find the original history entry for the *exact* previous week, if it exists
        const prevHistoryEntryOriginal = history.find(
          (h) => i > 0 && isSameDay(h.week, prevWeekDate)
        );

        const currentRank = currentEntry.rank;
        const lastWeekRank = prevHistoryEntryOriginal
          ? prevHistoryEntryOriginal.rank
          : null;
        const lastWeekPlays = prevHistoryEntryOriginal
          ? prevHistoryEntryOriginal.playsInWindow
          : null;

        // Calculate current overall peak up to this point
        // Note: This recalculates peak for every week, could optimize if needed
        const currentOverallPeak = history
          .slice(0, i + 1) // Include current entry
          .reduce(
            (minPeak, entry) => Math.min(minPeak, entry.rank),
            overallPeakPosition
          );

        // Determine Peak Status
        let peakStatus: PeakStatus = null;
        if (currentRank === currentOverallPeak) {
          // Check if this week *set* a new overall peak compared to the peak *before* this week
          const peakBeforeThisWeek =
            i > 0 ? enrichedHistory[i - 1].peakPosition : overallPeakPosition;
          if (peakBeforeThisWeek && currentOverallPeak < peakBeforeThisWeek) {
            peakStatus = 'PEAK'; // New absolute peak achieved this week
          } else if (lastWeekRank !== null && lastWeekRank > currentRank) {
            // If rank improved and matched the existing peak, it's a re-peak
            peakStatus = 'RE-PEAK';
          }
          // If it matched the peak but didn't improve from last week, no status change
        }

        // Determine Rank Status (Change from last week)
        let status: RankStatus = 0;
        if (lastWeekRank !== null) {
          status = lastWeekRank - currentRank; // Positive = Up, Negative = Down, 0 = Same
        } else {
          // Check if there's any history *before* the theoretical previous week
          const hasHistoryBeforePrevWeek = history.some(
            (h) => i > 0 && compareAsc(h.week, prevWeekDate) < 0
          );
          status = hasHistoryBeforePrevWeek ? 'RE-ENTRY' : 'NEW';
        }

        // Calculate Play Percentage Change
        let playPercentChange = 0;
        if (
          lastWeekPlays !== null &&
          typeof currentEntry.playsInWindow === 'number'
        ) {
          if (lastWeekPlays > 0) {
            playPercentChange =
              ((currentEntry.playsInWindow - lastWeekPlays) / lastWeekPlays) *
              100;
          } else if (currentEntry.playsInWindow > 0) {
            playPercentChange = Infinity; // Change from 0 to positive
          } else {
            playPercentChange = 0; // 0 to 0
          }
        }

        enrichedHistory.push({
          ...currentEntry,
          status, // NEW, RE-ENTRY, or rank difference number
          peakPosition:
            currentOverallPeak <= MAX_LIST_ITEMS ? currentOverallPeak : null, // Store the best rank achieved *up to this week*
          peakStatus: peakStatus, // PEAK, RE-PEAK, or null
          weeksOnChart: i + 1, // Simple count of weeks in the history array
          playPercentChange: playPercentChange,
          lastWeekRank: lastWeekRank, // Store for display convenience
        });
      }

      // Combine details with the enriched history
      const details = detailsMap.get(key); // Get existing details or empty object
      if (!details) {
        console.warn(`No details found for key: ${key}`);
        return; // Skip if no details found
      }
      // Ensure basic info exists if somehow missed in aggregation
      if (!details.artistName)
        details.artistName = key.includes(COMPOSITE_KEY_SEPARATOR)
          ? key.split(COMPOSITE_KEY_SEPARATOR)[0]
          : finalDataMap === processedData.artists
          ? key
          : 'Unknown Artist';
      if (
        'trackName' in details &&
        !details.trackName &&
        key.includes(COMPOSITE_KEY_SEPARATOR)
      ) {
        details.trackName = key.split(COMPOSITE_KEY_SEPARATOR)[1];
      }

      finalDataMap.set(key, { details, history: enrichedHistory });
    });

    return finalDataMap;
  }
}
