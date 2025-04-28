import * as ControlsActions from '../actions/controls.actions';

import { createReducer, on } from '@ngrx/store';
import * as DataActions from '../actions/data.actions';
import * as ExportActions from '../actions/export.actions';
import * as FileUploadActions from '../actions/file_upload.actions';
import * as UiActions from '../actions/ui.actions';
import { UiState, initialUiState } from '../state/ui.state';
import { updateCurrentWeekIndex } from '../actions/controls.actions';

export const uiReducer = createReducer(
  // Initial State
  initialUiState,

  // --- Handling View Changes ---

  /** Set the main view ('upload', 'list', 'history') */
  on(
    UiActions.setView,
    (state, { view }): UiState => ({
      ...state,
      currentView: view,
    })
  ),

  /** When a history entity is selected:
   * - Store the selected entity key/type.
   * - Change the view to 'history'.
   */
  on(
    UiActions.selectHistoryEntity,
    (state, { key, entityType }): UiState => ({
      ...state,
      selectedHistoryEntity: { key, entityType },
      currentView: 'history',
    })
  ),

  /** When navigating back to the list view:
   * - Clear the selected history entity.
   * - Change the view to 'list'.
   * - Keep currentWeekIndex and selectedEntityType as they were.
   */
  on(
    UiActions.goBackToList,
    (state): UiState => ({
      ...state,
      currentView: 'list',
    })
  ),

  // --- Handling Navigation/Selection State ---

  /** Directly set the current week index (typically dispatched by an effect) */
  on(
    UiActions.setCurrentWeekIndex,
    (state, { index }): UiState => ({
      ...state,
      currentWeekIndex: index,
      currentView: 'list',
    })
  ),

  /** Reset navigation state (typically after new data processing) */
  on(
    UiActions.resetNavigation,
    (state): UiState => ({
      ...state,
      currentWeekIndex: -1,
    })
  ),

  /** When the entity type filter changes ('track' / 'artist'):
   * - Update the selected entity type.
   * - Clear any selected history entity (as the list context changes).
   * - Ensure view is 'list'.
   */
  on(
    UiActions.selectEntityType,
    (state, { entityType }): UiState => ({
      ...state,
      selectedEntityType: entityType, // Clear history selection when type changes
      currentView: 'list', // Ensure we are on the list view
    })
  ),

  // --- Handling Status Messages ---

  /** Set a status message (can be info or error) */
  on(
    UiActions.setStatusMessage,
    (state, { message, isError }): UiState => ({
      ...state,
      statusMessage: message ?? null,
      isErrorStatus: isError ?? false, // Default to false if isError not provided
    })
  ),

  // React to Data actions to update status implicitly
  on(
    FileUploadActions.parseFileStart,
    DataActions.processDataStart,
    (state): UiState => ({
      ...state,
      statusMessage: 'Processing...', // Update status on start
      isErrorStatus: false,
    })
  ),
  // Note: Success/Failure status updates might be better handled by effects dispatching setStatusMessage
  // Or you can handle them directly here too:
  on(
    FileUploadActions.parseFileFailure,
    DataActions.processDataFailure,
    (state, { error }): UiState => ({
      ...state,
      statusMessage: error,
      isErrorStatus: true,
    })
  ),
  on(
    DataActions.processDataSuccess,
    (state, action): UiState => ({
      ...state,
      currentView: 'list', // Switch view on success
      currentWeekIndex: action.processedData.allWeeks.length - 1, // Go to latest week
      statusMessage: 'Data processed successfully.', // Set success message
      isErrorStatus: false,
    })
  ),

  // --- Handling Panel/Modal Visibility ---

  /** Open the settings panel */
  on(
    UiActions.openSettingsPanel,
    (state): UiState => ({
      ...state,
      isSettingsPanelOpen: true,
    })
  ),

  /** Close the settings panel */
  on(
    UiActions.closeSettingsPanel,
    (state): UiState => ({
      ...state,
      isSettingsPanelOpen: false,
    })
  ),

  /** Open the export preview modal (triggered by export effect success) */
  on(
    ExportActions.generateExportPreviewSuccess,
    (state): UiState => ({
      ...state,
      isExportPreviewOpen: true,
    })
  ),

  /** Close the export preview modal (on cancel or after confirm) */
  on(
    UiActions.closeExportPreview,
    ExportActions.confirmExport,
    (state): UiState => ({
      ...state,
      isExportPreviewOpen: false,
    })
  ),
  on(updateCurrentWeekIndex, (state, action): UiState => {
    // Avoid state change if index is already correct
    if (state.currentWeekIndex === action.weekIndex) {
      return state;
    }
    return {
      ...state,
      currentWeekIndex: action.weekIndex,
      selectedHistoryEntity: null,
      currentView: 'list',
    };
  })
);
