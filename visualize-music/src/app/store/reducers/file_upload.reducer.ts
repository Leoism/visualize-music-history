// src/app/store/reducers/data.reducer.ts

import { createReducer, on } from '@ngrx/store';
import {
  FileUploadState,
  initialFileUploadState,
} from '../state/file_upload.state'; // Assuming file_upload.state.ts exists
import * as FileUploadActions from '../actions/file_upload.actions';
import * as SettingsActions from '../actions/settings.actions'; // To react to settings changes

export const fileUploadReducer = createReducer(
  // Initial State
  initialFileUploadState,

  // --- Handling File Parsing ---

  /** When parsing starts (file selected/dropped):
   * - Reset all data (raw, processed).
   * - Set processing flag to true.
   * - Clear any previous errors.
   */
  on(FileUploadActions.parseFileStart, (unused): FileUploadState => {
    console.log('FileUploadActions.parseFileStart');
    return {
      ...initialFileUploadState, // Reset to initial state
      isProcessing: true, // Set loading flag
    };
  }),

  /** When parsing succeeds:
   * - Store the raw data.
   * - Keep processing flag true (as data processing usually follows).
   * - Error remains null.
   */
  on(
    FileUploadActions.parseFileSuccess,
    (state, { rawData }): FileUploadState => ({
      ...state,
      rawData: rawData,
      isProcessing: false, // Still processing (now the data itself)
    })
  ),

  /** When parsing fails:
   * - Clear any existing data (should already be cleared by parseFileStart).
   * - Set processing flag to false.
   * - Store the error message.
   */
  on(
    FileUploadActions.parseFileFailure,
    (state, { error }): FileUploadState => ({
      ...initialFileUploadState, // Reset to initial state
      isProcessing: false, // Stop loading
      processingError: error,
    })
  )
);
