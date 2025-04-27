// src/app/store/reducers/export.reducer.ts

import { createReducer, on } from '@ngrx/store';
import { ExportState, initialExportState } from '../state/export.state';
import * as ExportActions from '../actions/export.actions';
import * as UiActions from '../actions/ui.actions'; // Need this for closeExportPreview

export const exportReducer = createReducer(
  // Initial State
  initialExportState,

  // --- Handling Preview Generation ---

  /** When preview generation is requested:
   * - Set loading flag.
   * - Clear previous preview data, filename, and errors.
   */
  on(
    ExportActions.generateExportPreviewRequest,
    (state): ExportState => ({
      ...state,
      isGeneratingPreview: true,
      isGeneratingImage: false, // Ensure image generation isn't marked as active
    })
  ),

  /** When preview generation succeeds:
   * - Clear loading flag.
   * - Store the generated HTML and filename.
   * - Clear any previous error.
   */
  on(
    ExportActions.generateExportPreviewSuccess,
    (state, { html, filename }): ExportState => ({
      ...state,
      isGeneratingPreview: false,
      exportPreviewHtml: html,
      exportFilename: filename,
    })
  ),

  /** When preview generation fails:
   * - Clear loading flag.
   * - Store the error message.
   * - Clear any previous preview data/filename.
   */
  on(
    ExportActions.generateExportPreviewFailure,
    (state, { error }): ExportState => ({
      ...state,
      isGeneratingPreview: false,
      exportPreviewHtml: null,
      exportFilename: null,
      exportError: error,
    })
  ),

  // --- Handling Final Image Generation ---

  /** When the user confirms the export (triggers image generation effect):
   * - Clear preview data/filename/error as the modal will close.
   * - Keep loading flags false for now (image generation starts separately).
   */
  on(
    ExportActions.confirmExport,
    (state): ExportState => ({
      ...state,
      // Don't immediately set isGeneratingImage, wait for generateExportImageStart
      exportPreviewHtml: null, // Clear preview HTML after confirmation
      // Keep filename potentially? Or clear it? Let's clear it.
      exportFilename: null,
      exportError: null,
    })
  ),

  /** When the image generation process starts (dispatched by effect):
   * - Set image generation loading flag.
   * - Clear previous export errors.
   */
  on(
    ExportActions.generateExportImageStart,
    (state): ExportState => ({
      ...state,
      isGeneratingImage: true,
      exportError: null, // Clear previous errors before starting
    })
  ),

  /** When image generation and download succeed:
   * - Clear image generation loading flag.
   * - Error remains null.
   */
  on(
    ExportActions.generateExportImageSuccess,
    (state): ExportState => ({
      ...state,
      isGeneratingImage: false,
      exportError: null,
    })
  ),

  /** When image generation or download fails:
   * - Clear image generation loading flag.
   * - Store the error message.
   */
  on(
    ExportActions.generateExportImageFailure,
    (state, { error }): ExportState => ({
      ...state,
      isGeneratingImage: false,
      exportError: error,
    })
  ),

  // --- Handling UI Closing Modal ---

  /** When the export preview modal is closed (via UI action):
   * - Clear preview data, filename, and error.
   * - Reset loading flags (in case it was closed while loading).
   */
  on(
    UiActions.closeExportPreview,
    (state): ExportState => ({
      ...state,
      isGeneratingPreview: false, // Ensure loading flags are off
      isGeneratingImage: false,
      exportPreviewHtml: null,
      exportFilename: null,
      exportError: null,
    })
  )
);
