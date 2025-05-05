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
  PeakStatus,
  ProcessedArtistData,
  ProcessedData,
  ProcessedTrackData,
  RankStatus,
  RawDataEntry,
  TrackData,
  // BaseChartEntityData, // REMOVED Import
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
} from 'date-fns';
import { Router } from '@angular/router';
import { applySettings } from '../actions/settings.actions';

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
        return from(this.processRawData(rawData, settings)).pipe(
          map((processedData) => {
            console.log('[DataEffects] Data processing successful.');
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

  processDataSuccess$ = createEffect(
    () =>
      this.actions$.pipe(
        ofType(DataActions.processDataSuccess),
        tap(() => {
          this.router.navigate(['/charts']);
        })
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
          console.log('Calling processListeningData...');
          const startTime = performance.now();
          const processedData = this.processListeningData(rawData, settings);
          const endTime = performance.now();
          console.log(
            `processListeningData finished in ${endTime - startTime} ms.`
          );
          resolve(processedData);
        } catch (error) {
          console.error('Error during post-parse processing:', error);
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

    console.log(
      `Processing listening data (Window: ${
        settings.isAllTimeMode
          ? 'All-Time'
          : settings.slidingWindowWeeks + ' weeks'
      })...`
    );
    const overallStartTime = performance.now();

    // 1. Aggregate weekly counts and basic entity details
    const step1StartTime = performance.now();
    const { weeklyCounts, entityDetails } = this.aggregateWeeklyCounts(rawData);
    const step1EndTime = performance.now();
    console.log(
      `Step 1 (Aggregation) took: ${step1EndTime - step1StartTime} ms`
    );

    // 2. Get sorted list of all unique week start dates
    const allWeeks = Array.from(weeklyCounts.keys())
      .map((weekKey) => parseISO(weekKey))
      .sort(compareAsc);

    if (allWeeks.length === 0) {
      console.warn('No valid listening data found after aggregation.');
      processedData.allWeeks = [];
      const overallEndTime = performance.now();
      console.log(
        `Total data processing finished (no data) in ${overallEndTime - overallStartTime} ms.`
      );
      return processedData;
    }
    processedData.allWeeks = allWeeks;

    // 3. Calculate ranks for each week (Sliding Window or All-Time)
    const step2StartTime = performance.now();
    // calculateRanksOptimized remains unchanged internally
    const { tempTrackHistory, tempArtistHistory } =
      this.calculateRanksOptimized(allWeeks, weeklyCounts, settings);
    const step2EndTime = performance.now();
    console.log(`Step 2 (Ranking) took: ${step2EndTime - step2StartTime} ms`);

    // 4. Calculate status, peak position, weeks on chart, etc. and finalize data structure
    const step3StartTime = performance.now();

    processedData.tracks = this.calculateTrackHistoryStats(
      tempTrackHistory,
      entityDetails.tracks
    );
    processedData.artists = this.calculateArtistHistoryStats(
      tempArtistHistory,
      entityDetails.artists
    );

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
      string, // weekKey (e.g., 'YYYY-MM-DD')
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
    newData: {
      artistName: string;
      artistMbid: string | null;
    }
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
      EntityKey,
      Array<{ week: Date; rank: number; playsInWindow: number }>
    > = new Map();
    const tempArtistHistory: Map<
      EntityKey,
      Array<{ week: Date; rank: number; playsInWindow: number }>
    > = new Map();
    const windowTrackPlays: Map<EntityKey, number> = new Map();
    const windowArtistPlays: Map<EntityKey, number> = new Map();
    const cumulativeTrackPlays: Map<EntityKey, number> = new Map();
    const cumulativeArtistPlays: Map<EntityKey, number> = new Map();

    allWeeks.forEach((currentWeekDate, weekIndex) => {
      const currentWeekKey = formatDateKey(currentWeekDate);
      if (!currentWeekKey) return;
      const currentWeekData = weeklyCounts.get(currentWeekKey);
      const currentTrackCounts = currentWeekData?.trackCounts ?? new Map();
      const currentArtistCounts = currentWeekData?.artistCounts ?? new Map();
      let rankedTracksSource: Map<EntityKey, number>;
      let rankedArtistsSource: Map<EntityKey, number>;

      if (settings.isAllTimeMode) {
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
        rankedTracksSource = cumulativeTrackPlays;
        rankedArtistsSource = cumulativeArtistPlays;
      } else {
        currentTrackCounts.forEach((count, key) =>
          windowTrackPlays.set(key, (windowTrackPlays.get(key) ?? 0) + count)
        );
        currentArtistCounts.forEach((count, key) =>
          windowArtistPlays.set(key, (windowArtistPlays.get(key) ?? 0) + count)
        );
        const windowSize = settings.slidingWindowWeeks ?? 1;
        if (weekIndex >= windowSize) {
          const leavingWeekDate = allWeeks[weekIndex - windowSize];
          const leavingWeekKey = formatDateKey(leavingWeekDate);
          const leavingWeekData = leavingWeekKey
            ? weeklyCounts.get(leavingWeekKey)
            : undefined;
          if (leavingWeekData?.trackCounts) {
            leavingWeekData.trackCounts.forEach((count, key) => {
              const newPlays = (windowTrackPlays.get(key) ?? 0) - count;
              if (newPlays > 0) windowTrackPlays.set(key, newPlays);
              else windowTrackPlays.delete(key);
            });
          }
          if (leavingWeekData?.artistCounts) {
            leavingWeekData.artistCounts.forEach((count, key) => {
              const newPlays = (windowArtistPlays.get(key) ?? 0) - count;
              if (newPlays > 0) windowArtistPlays.set(key, newPlays);
              else windowArtistPlays.delete(key);
            });
          }
        }
        rankedTracksSource = windowTrackPlays;
        rankedArtistsSource = windowArtistPlays;
      }

      const rankedTracks = Array.from(rankedTracksSource.entries())
        .sort(([, a], [, b]) => b - a)
        .slice(0, MAX_LIST_ITEMS);
      rankedTracks.forEach(([key, plays], index) => {
        if (!tempTrackHistory.has(key)) tempTrackHistory.set(key, []);
        tempTrackHistory.get(key)!.push({
          week: currentWeekDate,
          rank: index + 1,
          playsInWindow: plays,
        });
      });

      const rankedArtists = Array.from(rankedArtistsSource.entries())
        .sort(([, a], [, b]) => b - a)
        .slice(0, MAX_LIST_ITEMS);
      rankedArtists.forEach(([key, plays], index) => {
        if (!tempArtistHistory.has(key)) tempArtistHistory.set(key, []);
        tempArtistHistory.get(key)!.push({
          week: currentWeekDate,
          rank: index + 1,
          playsInWindow: plays,
        });
      });
    });
    return { tempTrackHistory, tempArtistHistory };
  }

  private calculateTrackHistoryStats(
    tempHistoryMap: Map<
      EntityKey,
      Array<{ week: Date; rank: number; playsInWindow: number }>
    >,
    detailsMap: Map<EntityKey, TrackData>
  ): Map<EntityKey, ProcessedTrackData> {
    const finalDataMap: Map<EntityKey, ProcessedTrackData> = new Map();

    tempHistoryMap.forEach((rawHistory, key) => {
      const details = detailsMap.get(key);
      if (!details) {
        console.warn(
          `No track details found for key during history calculation: ${key}. Skipping.`
        );
        return;
      }

      rawHistory.sort((a, b) => compareAsc(a.week, b.week));

      const enrichedHistory: HistoryEntry[] = [];
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

        enrichedHistory.push({
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

      finalDataMap.set(key, { details, history: enrichedHistory }); // Structure is ProcessedTrackData
    });
    return finalDataMap;
  }

  private calculateArtistHistoryStats(
    tempHistoryMap: Map<
      EntityKey,
      Array<{ week: Date; rank: number; playsInWindow: number }>
    >,
    detailsMap: Map<EntityKey, ArtistData>
  ): Map<EntityKey, ProcessedArtistData> {
    const finalDataMap: Map<EntityKey, ProcessedArtistData> = new Map();

    tempHistoryMap.forEach((rawHistory, key) => {
      const details = detailsMap.get(key); // Type is ArtistData | undefined
      if (!details) {
        console.warn(
          `No artist details found for key during history calculation: ${key}. Skipping.`
        );
        return;
      }

      rawHistory.sort((a, b) => compareAsc(a.week, b.week));

      const enrichedHistory: HistoryEntry[] = [];
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

        enrichedHistory.push({
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
