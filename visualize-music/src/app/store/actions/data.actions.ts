import { createAction, props } from '@ngrx/store';
import {
  ProcessedData,
  RawDataEntry,
} from '../../common/interfaces/data.interfaces'; // Adjust path if needed

// --- File Parsing Actions ---

/**
 * Dispatched by FileUploadComponent when a valid CSV file is selected or dropped.
 * Triggers the DataEffects to start parsing the file using PapaParse.
 * Carries the raw File object.
 */
export const parseFileStart = createAction(
  '[Data] Parse File Start',
  props<{ file: File }>()
);

/**
 * Dispatched by DataEffects when PapaParse successfully parses the CSV file.
 * Carries the resulting raw data array.
 * This often triggers the `processDataStart` action via another effect.
 */
export const parseFileSuccess = createAction(
  '[Data] Parse File Success',
  props<{ rawData: RawDataEntry[] }>()
);

/**
 * Dispatched by DataEffects (or potentially FileUploadComponent for immediate type errors)
 * when file parsing fails (e.g., PapaParse error, invalid format, wrong file type).
 * Carries the error message string.
 */
export const parseFileFailure = createAction(
  '[Data] Parse File Failure',
  props<{ error: string }>()
);

// --- Data Processing Actions ---

/**
 * Dispatched by DataEffects after successful file parsing OR when settings change
 * necessitates reprocessing existing raw data.
 * Signals the start of the potentially long-running data aggregation/ranking process.
 * Triggers the DataEffects to perform the processing logic.
 */
export const processDataStart = createAction(
  '[Data] Process Data Start'
  // No payload needed here typically, the effect will get rawData and settings from the store via withLatestFrom
);

/**
 * Dispatched by DataEffects when the data processing logic
 * (aggregation, ranking, history calculation) completes successfully.
 * Carries the fully processed data structure.
 */
export const processDataSuccess = createAction(
  '[Data] Process Data Success',
  props<{ processedData: ProcessedData }>()
);

/**
 * Dispatched by DataEffects when the data processing logic fails.
 * Carries the error message string.
 */
export const processDataFailure = createAction(
  '[Data] Process Data Failure',
  props<{ error: string }>()
);

// --- Optional Actions ---

/**
 * Could be used to explicitly clear all loaded data and reset the data state.
 * Alternatively, `parseFileStart` reducer logic might handle resetting state.
 */
// export const clearData = createAction('[Data] Clear Data');
