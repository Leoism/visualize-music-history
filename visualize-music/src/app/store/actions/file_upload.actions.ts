import { createAction, props } from '@ngrx/store';
import { RawDataEntry } from '../../common/interfaces/data.interfaces'; // Adjust path if needed

/**
 * Dispatched by FileUploadComponent when a valid CSV file is selected or dropped.
 * Triggers the FileUploadEffects to start parsing the file using PapaParse.
 * Carries the raw File object.
 */
export const parseFileStart = createAction(
  '[Data] Parse File Start',
  props<{ file: File }>()
);

/**
 * Dispatched by FileUploadEffects when PapaParse successfully parses the CSV file.
 * Carries the resulting raw data array.
 * This often triggers the `processDataStart` action via another effect.
 */
export const parseFileSuccess = createAction(
  '[Data] Parse File Success',
  props<{ rawData: RawDataEntry[] }>()
);

/**
 * Dispatched by FileUploadEffects (or potentially FileUploadComponent for immediate type errors)
 * when file parsing fails (e.g., PapaParse error, invalid format, wrong file type).
 * Carries the error message string.
 */
export const parseFileFailure = createAction(
  '[Data] Parse File Failure',
  props<{ error: string }>()
);
