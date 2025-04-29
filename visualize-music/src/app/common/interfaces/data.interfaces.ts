/** Represents a single row/entry from the parsed CSV file */
export interface RawDataEntry {
  uts: number; // Unix Timestamp (seconds)
  artist: string;
  track: string;
  album?: string;
  artist_mbid?: string;
  track_mbid?: string;
  album_mbid?: string;
}

/** Represents the status change of an item from the previous week */
export type RankStatus = number | 'NEW' | 'RE-ENTRY'; // number = rank difference (+ve up, -ve down, 0 same)

/** Represents the peak status achieved in a given week */
export type PeakStatus = 'PEAK' | 'RE-PEAK' | null;

/** Represents a single entry in an entity's chart history */
export interface HistoryEntry {
  week: Date;
  rank: number;
  playsInWindow: number;
  status: RankStatus;
  peakPosition: number | null;
  peakStatus: PeakStatus;
  weeksOnChart: number;
  playPercentChange: number;
  lastWeekRank: number | null;
}

/** Type alias for unique identifiers (MBID or composite key) */
export type EntityKey = string;

/** Type alias for entity types */
export type EntityType = 'tracks' | 'artists';

/** Base interface for shared properties between TrackData and ArtistData */
interface BaseChartEntityData {
  totalPlays: number;
  firstPlayDate: Date | null;
  lastPlayDate: Date | null;
  history: HistoryEntry[];
}

/** Represents processed data for a single track */
export interface TrackData extends BaseChartEntityData {
  trackName: string | null;
  artistName: string | null;
  artistKey: EntityKey | null;
  albumMbid: string | null;
}

/** Represents processed data for a single artist */
export interface ArtistData extends BaseChartEntityData {
  artistName: string | null;
}

/** Represents processed data for a single track */
export interface ProcessedTrackData {
  history: HistoryEntry[];
  details: TrackData;
}

/** Represents processed data for a single artist */
export interface ProcessedArtistData {
  history: HistoryEntry[];
  details: ArtistData;
}

/** Represents the fully processed and structured listening data */
export interface ProcessedData {
  tracks: Map<EntityKey, ProcessedTrackData>;
  artists: Map<EntityKey, ProcessedArtistData>;
  allWeeks: Date[];
  rawData: RawDataEntry[];
}

/** Represents a formatted item ready for display in the Top 100 list */
export interface ChartItem {
  key: EntityKey;
  entityType: EntityType;
  name: string;
  artistName: string | null;
  albumMbid: string | null;
  rank: number;
  plays: number;
  rankStatus: RankStatus;
  peak: number | null;
  peakStatus: PeakStatus;
  weeksOnChart: number;
  playPercentChange: number | null;
  lastWeekRank: number | null;
}
