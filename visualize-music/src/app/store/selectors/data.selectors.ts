import { createFeatureSelector, createSelector } from '@ngrx/store';
import {
  DEFAULT_PEAK_VALUE,
  MAX_LIST_ITEMS,
} from '../../common/utils/constants';
import { formatDateKey } from '../../common/utils/date_utils';
import {
  ArtistData,
  ChartItem,
  EntityKey,
  EntityType,
  HistoryEntry,
  ProcessedData,
  RawDataEntry,
  TrackData,
} from '../../common/interfaces/data.interfaces';
import { DataState } from '../state/data.state'; // Adjust path if needed
import {
  selectCurrentWeekDateString,
  selectSelectedEntityType,
  selectSelectedHistoryEntity,
} from './ui.selectors'; // Import relevant UI selectors

// --- Helper Function (example - move to utils if preferred) ---
// This encapsulates the logic previously in prepareTop100ListData
function getListDataForWeek(
  dataMap: Map<EntityKey, TrackData | ArtistData> | undefined,
  weekKey: string | null,
  entityType: EntityType | null
): ChartItem[] {
  const listData: ChartItem[] = [];
  if (!dataMap || !weekKey || !entityType) {
    return [];
  }

  dataMap.forEach((data, key) => {
    const rankEntry = data.history?.find(
      (h: HistoryEntry) => formatDateKey(h.week) === weekKey
    );

    if (rankEntry && rankEntry.rank <= MAX_LIST_ITEMS) {
      // Only include items actually in the top N for that week
      const isTrack = entityType === 'track';
      const trackData = data as TrackData; // Type assertion
      const artistData = data as ArtistData; // Type assertion

      listData.push({
        key: key,
        entityType: entityType, // Pass the type along
        name: (isTrack ? trackData.trackName : artistData.artistName) || key,
        artistName: isTrack ? trackData.artistName : undefined,
        albumMbid: isTrack ? trackData.albumMbid : undefined,
        rank: rankEntry.rank,
        plays: rankEntry.playsInWindow,
        status: rankEntry.status,
        peak: rankEntry.peakPosition,
        peakStatus: rankEntry.peakStatus,
        weeksOnChart: rankEntry.weeksOnChart,
        playPercentChange: rankEntry.playPercentChange,
        lastWeekRank: rankEntry.lastWeekRank,
      });
    }
  });

  // Sort by rank
  listData.sort((a, b) => a.rank - b.rank);
  return listData;
}

// --- Feature Selector ---

export const selectDataState = createFeatureSelector<DataState>('data'); // 'data' must match the key in appReducers

// --- Basic Property Selectors ---

export const selectRawData = createSelector(
  selectDataState,
  (state: DataState): RawDataEntry[] | null => state.rawData
);

export const selectProcessedData = createSelector(
  selectDataState,
  (state: DataState): ProcessedData | null => state.processedData
);

export const selectIsProcessing = createSelector(
  selectDataState,
  (state: DataState): boolean => state.isProcessing
);

export const selectProcessingError = createSelector(
  selectDataState,
  (state: DataState): string | null => state.processingError
);

// --- Intermediate Selectors (Extracting parts of ProcessedData) ---

export const selectAllWeeks = createSelector(
  selectProcessedData,
  (processedData: ProcessedData | null): Date[] => processedData?.allWeeks ?? []
);

export const selectAllTracksMap = createSelector(
  selectProcessedData,
  (processedData: ProcessedData | null): Map<EntityKey, TrackData> =>
    processedData?.tracks ?? new Map()
);

export const selectAllArtistsMap = createSelector(
  selectProcessedData,
  (processedData: ProcessedData | null): Map<EntityKey, ArtistData> =>
    processedData?.artists ?? new Map()
);

// --- Derived Selectors (Combining Data and UI state) ---

/** Selects the formatted list data (Top 100) for the currently selected week and entity type */
export const selectListDataForCurrentWeek = createSelector(
  selectProcessedData,
  selectCurrentWeekDateString, // From ui.selectors
  selectSelectedEntityType, // From ui.selectors
  (
    processedData: ProcessedData | null,
    weekKey: string | null,
    entityType: EntityType | null
  ): ChartItem[] => {
    if (!processedData || !weekKey || !entityType) {
      return [];
    }
    const dataMap =
      entityType === 'track' ? processedData.tracks : processedData.artists;
    // Use helper function for complex logic
    return getListDataForWeek(dataMap, weekKey, entityType);
  }
);

/** Selects the full data (including history) for the currently selected entity (for History View) */
export const selectHistoryDataForSelectedEntity = createSelector(
  selectProcessedData,
  selectSelectedHistoryEntity, // From ui.selectors
  (
    processedData: ProcessedData | null,
    selectedEntity: { key: EntityKey; type: EntityType } | null
  ): TrackData | ArtistData | null => {
    if (!processedData || !selectedEntity) {
      return null;
    }
    const dataMap =
      selectedEntity.type === 'track'
        ? processedData.tracks
        : processedData.artists;
    return dataMap?.get(selectedEntity.key) ?? null;
  }
);

/** Selects the Artist details related to the currently viewed Track history */
export const selectArtistDetailsForTrackHistory = createSelector(
  selectAllArtistsMap,
  selectHistoryDataForSelectedEntity, // This selector should yield TrackData when this is relevant
  (
    artistsMap: Map<EntityKey, ArtistData>,
    currentEntityData: TrackData | ArtistData | null
  ): ArtistData | null => {
    // Ensure the current entity is a track and has an artist key
    const trackData = currentEntityData as TrackData; // Type assertion
    if (trackData?.artistKey) {
      return artistsMap.get(trackData.artistKey) ?? null;
    }
    return null;
  }
);

/** Selects the Top N songs (by peak, then plays) for the currently viewed Artist history */
export const selectArtistTopSongsForArtistHistory = createSelector(
  selectAllTracksMap,
  selectSelectedHistoryEntity, // This should be an artist entity when relevant
  (
    tracksMap: Map<EntityKey, TrackData>,
    selectedEntity: { key: EntityKey; type: EntityType } | null
  ): any[] => {
    // Define a specific interface later if needed
    if (
      !selectedEntity ||
      selectedEntity.type !== 'artist' ||
      tracksMap.size === 0
    ) {
      return [];
    }

    const artistKey = selectedEntity.key;
    const artistTracks: any[] = []; // Use a proper interface like ArtistTopSongItem

    tracksMap.forEach((trackData, trackKey) => {
      if (trackData.artistKey === artistKey) {
        // Calculate overall peak for this track
        const overallPeak =
          trackData.history?.reduce(
            (min, entry) =>
              Math.min(min, entry.peakPosition ?? DEFAULT_PEAK_VALUE),
            DEFAULT_PEAK_VALUE
          ) ?? DEFAULT_PEAK_VALUE;

        const peakEntry = trackData.history?.find(
          (entry) => entry.rank === overallPeak
        );
        const peakWeekDate = peakEntry?.week;

        artistTracks.push({
          key: trackKey,
          name: trackData.trackName || 'Unknown Track',
          totalPlays: trackData.totalPlays || 0,
          peak: overallPeak <= MAX_LIST_ITEMS ? overallPeak : null,
          peakWeek: peakWeekDate,
        });
      }
    });

    // Sort by peak ascending (nulls/unranked last), then by total plays descending
    artistTracks.sort((a, b) => {
      const peakA = a.peak === null ? DEFAULT_PEAK_VALUE + 1 : a.peak; // Put unranked after rank 101
      const peakB = b.peak === null ? DEFAULT_PEAK_VALUE + 1 : b.peak;
      if (peakA !== peakB) {
        return peakA - peakB;
      }
      return (b.totalPlays || 0) - (a.totalPlays || 0);
    });

    return artistTracks.slice(0, 10); // Return top 10
  }
);

/** Selects the first available week's Date object, or null */
export const selectFirstWeekDate = createSelector(
  selectAllWeeks,
  (allWeeks: Date[]): Date | null => allWeeks?.[0] ?? null
);

/** Selects the last available week's Date object, or null */
export const selectLastWeekDate = createSelector(
  selectAllWeeks,
  (allWeeks: Date[]): Date | null => allWeeks?.[allWeeks.length - 1] ?? null
);
