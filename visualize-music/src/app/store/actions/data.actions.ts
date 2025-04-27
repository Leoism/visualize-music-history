import { createAction, props } from '@ngrx/store';
import { ProcessedData } from '../../common/interfaces/data.interfaces';

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
