// src/app/store/actions/export.actions.ts

import { createAction, props } from '@ngrx/store';

// --- Export Preview Generation ---

/**
 * Dispatched by ControlsComponent when the user clicks the "Export Top N" button.
 * Signals the intent to start the export process.
 * Triggers ExportEffects to generate the HTML preview.
 */
export const generateExportPreviewRequest = createAction(
  '[Export] Generate Preview Request'
);

/**
 * Dispatched by ExportEffects when the HTML preview content has been successfully generated.
 * Carries the HTML string and the proposed filename.
 * Handled by ExportReducer to store the data and UiReducer to open the preview modal.
 */
export const generateExportPreviewSuccess = createAction(
  '[Export] Generate Preview Success',
  props<{ html: string; filename: string }>()
);

/**
 * Dispatched by ExportEffects if generating the HTML preview fails.
 * Carries the error message string.
 * Handled by ExportReducer to store the error and potentially UiEffects to show a status message.
 */
export const generateExportPreviewFailure = createAction(
  '[Export] Generate Preview Failure',
  props<{ error: string }>()
);

// --- Final Image Generation & Download ---

/**
 * Dispatched by ExportPreviewModalComponent when the user confirms the preview.
 * Signals the intent to generate the final image from the preview HTML.
 * Triggers ExportEffects to use html2canvas and initiate the download.
 * Also handled by UiReducer to close the preview modal.
 */
export const confirmExport = createAction('[Export] Confirm Export');

/**
 * Dispatched by ExportEffects just before calling html2canvas.
 * Handled by ExportReducer to set the image generation loading flag.
 */
export const generateExportImageStart = createAction(
  '[Export] Generate Image Start'
);

/**
 * Dispatched by ExportEffects after html2canvas finishes and download is triggered.
 * Handled by ExportReducer to clear the image generation loading flag.
 * Potentially handled by UiEffects to show a success message.
 */
export const generateExportImageSuccess = createAction(
  '[Export] Generate Image Success'
);

/**
 * Dispatched by ExportEffects if html2canvas or the download process fails.
 * Carries the error message string.
 * Handled by ExportReducer to store the error and clear the loading flag.
 * Potentially handled by UiEffects to show a status message.
 */
export const generateExportImageFailure = createAction(
  '[Export] Generate Image Failure',
  props<{ error: string }>()
);

// --- UI Actions related to Export (could also live in ui.actions) ---
// Defined in ui.actions.ts now for consistency based on reducer implementation:
// closeExportPreview
