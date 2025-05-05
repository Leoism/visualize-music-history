import { createFeatureSelector, createSelector } from '@ngrx/store';
import {
  ArtistData,
  ChartItem,
  EntityKey,
  EntityType,
  ProcessedArtistData,
  ProcessedData,
  ProcessedTrackData,
  TrackData,
} from '../../common/interfaces/data.interfaces';
import {
  DEFAULT_PEAK_VALUE,
  MAX_LIST_ITEMS,
} from '../../common/utils/constants';
import { formatDateKey } from '../../common/utils/date_utils';
import { DataState } from '../state/data.state'; // Adjust path if needed

import { getYear } from 'date-fns';
import {
  selectCurrentWeekIndex,
  selectSelectedEntityType,
  selectSelectedHistoryEntity,
} from './ui.selectors'; // Import relevant UI selectors

// This encapsulates the logic previously in prepareTop100ListData
function getListDataForWeek(
  dataMap: Map<EntityKey, ProcessedTrackData | ProcessedArtistData> | undefined,
  weekKey: string | null,
  entityType: EntityType | null
): ChartItem[] {
  const listData: ChartItem[] = [];
  console.log('hello');
  if (!dataMap || !weekKey || !entityType) {
    return [];
  }

  dataMap.forEach((data, key) => {
    const rankEntry = data.history.years
      .get(getYear(weekKey))
      ?.weeks.get(weekKey);

    if (rankEntry && rankEntry.rank <= MAX_LIST_ITEMS) {
      // Only include items actually in the top N for that week
      const isTrack = entityType === 'tracks';
      const trackData = data as ProcessedTrackData; // Type assertion
      const artistData = data as ProcessedArtistData; // Type assertion

      listData.push({
        key: key,
        entityType: entityType, // Pass the type along
        name:
          (isTrack
            ? trackData.details.trackName
            : artistData.details.artistName) || key,
        artistName: isTrack ? trackData.details.artistName : null,
        albumMbid: isTrack ? trackData.details.albumMbid : null,
        rank: rankEntry.rank,
        plays: rankEntry.playsInWindow,
        rankStatus: rankEntry.status,
        peak: rankEntry.peakPosition,
        peakStatus: rankEntry.peakStatus,
        weeksOnChart: rankEntry.weeksOnChart,
        playPercentChange: rankEntry.playPercentChange,
        lastWeekRank: rankEntry.lastWeekRank,
        trackMbid: trackData.details.trackMbid,
        artistMbid: trackData.details.artistMbid,
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

/** Selects the Date object for the currently selected week, or null */
export const selectCurrentWeekDate = createSelector(
  selectAllWeeks, // From data.selectors
  selectCurrentWeekIndex,
  (allWeeks: Date[], weekIndex: number): Date | undefined => {
    if (!allWeeks || allWeeks.length === 0) {
      return undefined;
    }
    const maxIndex = allWeeks.length - 1;
    const targetIndex = weekIndex === -1 ? maxIndex : weekIndex;

    if (targetIndex >= 0 && targetIndex <= maxIndex) {
      return allWeeks[targetIndex];
    }
    return undefined; // Index out of bounds
  }
);

/** Selects the formatted date string (yyyy-MM-dd) for the current week, or null */
export const selectCurrentWeekDateString = createSelector(
  selectCurrentWeekDate,
  (date: Date | undefined): string | undefined => {
    return date ? formatDateKey(date) : undefined;
  }
);

/** Selects whether the "Previous Week" navigation should be enabled */
export const selectCanNavigatePrev = createSelector(
  selectAllWeeks, // From data.selectors
  selectCurrentWeekIndex,
  (allWeeks: Date[], weekIndex: number): boolean => {
    if (!allWeeks || allWeeks.length === 0) {
      return false;
    }
    const maxIndex = allWeeks.length - 1;
    const currentIndex = weekIndex === -1 ? maxIndex : weekIndex;
    return currentIndex > 0;
  }
);

/** Selects whether the "Next Week" navigation should be enabled */
export const selectCanNavigateNext = createSelector(
  selectAllWeeks, // From data.selectors
  selectCurrentWeekIndex,
  (allWeeks: Date[], weekIndex: number): boolean => {
    if (!allWeeks || allWeeks.length === 0) {
      return false;
    }
    const maxIndex = allWeeks.length - 1;
    // Cannot navigate forward if already at the latest week (-1 or maxIndex)
    return weekIndex !== -1 && weekIndex < maxIndex;
  }
);

// --- Derived Selectors (Combining Data and UI state) ---

/** Selects the formatted list data (Top 100) for the currently selected week and entity type */
export const selectListDataForCurrentWeek = createSelector(
  selectProcessedData,
  selectSelectedEntityType, // From ui.selectors
  selectCurrentWeekDateString, // From ui.selectors
  (
    processedData: ProcessedData | null,
    entityType: EntityType | null,
    weekKey?: string
  ): ChartItem[] => {
    console.log('meow');
    if (!processedData || !weekKey || !entityType) {
      return [];
    }
    const dataMap =
      entityType === 'tracks' ? processedData.tracks : processedData.artists;
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
    selectedEntity: { key: EntityKey; entityType: EntityType } | null
  ): ProcessedArtistData | ProcessedTrackData | null => {
    if (!processedData || !selectedEntity) {
      return null;
    }
    const dataMap =
      selectedEntity.entityType === 'tracks'
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
    currentEntityData: ProcessedTrackData | ProcessedArtistData | null
  ): ArtistData | null => {
    // Ensure the current entity is a track and has an artist key
    const trackData = currentEntityData as ProcessedTrackData; // Type assertion
    if (trackData?.details?.artistMbid) {
      return artistsMap.get(trackData.details?.artistMbid) ?? null;
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
    selectedEntity: { key: EntityKey; entityType: EntityType } | null
  ): any[] => {
    // Define a specific interface later if needed
    if (
      !selectedEntity ||
      selectedEntity.entityType !== 'artists' ||
      tracksMap.size === 0
    ) {
      return [];
    }

    const artistMbid = selectedEntity.key;
    const artistTracks: any[] = []; // Use a proper interface like ArtistTopSongItem

    tracksMap.forEach((trackData, trackKey) => {
      if (trackData.artistMbid === artistMbid) {
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

export const selectTracksMap = createSelector(
  selectDataState,
  (state: DataState) => state.processedData?.tracks
);

export const selectTrackByIdSelectorFactory = (id: EntityKey) =>
  createSelector(selectTracksMap, (tracksMap) => {
    return tracksMap ? tracksMap.get(id) : undefined;
  });

export const selectArtistsMap = createSelector(
  selectDataState,
  (state: DataState) => state.processedData?.artists
);

export const selectArtistByIdSelectorFactory = (id: EntityKey) =>
  createSelector(selectArtistsMap, (artistsMap) => {
    return artistsMap ? artistsMap.get(id) : undefined;
  });
