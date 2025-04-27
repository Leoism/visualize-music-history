// src/app/store/reducers/data.reducer.ts

import { createReducer, on } from '@ngrx/store';
import { DataState, initialDataState } from '../state/data.state';
import * as DataActions from '../actions/data.actions';
import * as SettingsActions from '../actions/settings.actions'; // To react to settings changes

export const dataReducer = createReducer(
  // Initial State
  initialDataState,

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
