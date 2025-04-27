import { EntityKey, EntityType } from '../../common/interfaces/data.interfaces';

export interface UiState {
  /** Determines the main view being displayed ('upload', 'list', or 'history') */
  currentView: 'upload' | 'list' | 'history';

  /** The zero-based index of the currently viewed week in the `allWeeks` array. -1 signifies the latest week. */
  currentWeekIndex: number;

  /** The type of entity currently selected for display in the list or history view ('track' or 'artist') */
  selectedEntityType: EntityType;

  /** Holds the key and type of the specific track or artist being viewed in the history mode, null otherwise */
  selectedHistoryEntity?: { key: EntityKey; type: EntityType };

  /** A general status message to display to the user (e.g., 'Processing...', 'Loaded.') */
  statusMessage?: string;

  /** Flag indicating if the current statusMessage represents an error */
  isErrorStatus: boolean;

  /** Flag controlling the visibility of the settings panel/modal */
  isSettingsPanelOpen: boolean;

  /** Flag controlling the visibility of the export preview modal */
  isExportPreviewOpen: boolean;
}

export const initialUiState: UiState = {
  currentView: 'upload', // Start at the upload screen
  currentWeekIndex: -1, // Default to the latest week when data loads
  selectedEntityType: 'track', // Default to showing tracks
  statusMessage: 'No file selected.', // Initial status message
  isErrorStatus: false,
  isSettingsPanelOpen: false,
  isExportPreviewOpen: false,
};
