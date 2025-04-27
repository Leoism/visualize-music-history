// src/app/store/reducers/data.reducer.ts

import { createReducer, on } from '@ngrx/store';
import { DataState, initialDataState } from '../state/data.state';
import * as DataActions from '../actions/data.actions';
import * as SettingsActions from '../actions/settings.actions'; // To react to settings changes

export const dataReducer = createReducer(
  // Initial State
  initialDataState,

  // --- Handling File Parsing ---

  /** When parsing starts (file selected/dropped):
   * - Reset all data (raw, processed).
   * - Set processing flag to true.
   * - Clear any previous errors.
   */
  on(
    DataActions.parseFileStart,
    (unused): DataState => ({
      ...initialDataState, // Reset to initial state
      isProcessing: true, // Set loading flag
    })
  ),

  /** When parsing succeeds:
   * - Store the raw data.
   * - Keep processing flag true (as data processing usually follows).
   * - Error remains null.
   */
  on(
    DataActions.parseFileSuccess,
    (state, { rawData }): DataState => ({
      ...state,
      rawData: rawData,
      isProcessing: true, // Still processing (now the data itself)
    })
  ),

  /** When parsing fails:
   * - Clear any existing data (should already be cleared by parseFileStart).
   * - Set processing flag to false.
   * - Store the error message.
   */
  on(
    DataActions.parseFileFailure,
    (state, { error }): DataState => ({
      ...initialDataState, // Reset to initial state
      isProcessing: false, // Stop loading
      processingError: error,
    })
  ),

  // --- Handling Data Processing ---

  /** When data processing starts (triggered by effect after parse success or settings change):
   * - Ensure processing flag is true.
   * - Clear previous processed data.
   * - Clear any previous processing errors.
   */
  on(
    DataActions.processDataStart,
    (state): DataState => ({
      ...state, // Keep rawData if reprocessing
      // Clear previous results
      isProcessing: true,
    })
  ),

  /** When settings are applied (might trigger reprocessing via effect):
   * - If rawData exists, immediately set processing to true and clear old results
   * for faster UI feedback while the effect decides if reprocessing is needed.
   */
  on(
    SettingsActions.applySettings,
    (state): DataState =>
      state.rawData
        ? {
            // Only change state if we have data to potentially reprocess
            ...state,

            isProcessing: true, // Assume processing will start
          }
        : state // Otherwise, do nothing to data state yet
  ),

  /** When data processing succeeds:
   * - Store the new processed data.
   * - Set processing flag to false.
   * - Error remains null.
   */
  on(
    DataActions.processDataSuccess,
    (state, { processedData }): DataState => ({
      ...state,
      processedData: processedData,
      isProcessing: false,
    })
  ),

  /** When data processing fails:
   * - Clear processed data.
   * - Set processing flag to false.
   * - Store the error message.
   */
  on(
    DataActions.processDataFailure,
    (state, { error }): DataState => ({
      ...state, // Keep rawData
      isProcessing: false,
      processingError: error,
    })
  )

  // Add handler for clearData action if you implement it
  // on(DataActions.clearData, (state) => initialDataState)
);
