// src/app/store/actions/ui.actions.ts

import { createAction, props } from '@ngrx/store';
import { EntityKey, EntityType } from '../../common/interfaces/data.interfaces'; // Adjust path

// --- View Management ---

/**
 * Dispatched by Effects (e.g., after processing data) to explicitly set the main view.
 * Handled directly by UiReducer.
 */
export const setView = createAction(
  '[UI] Set View',
  props<{ view: 'upload' | 'list' | 'history' }>()
);

/**
 * Dispatched by Components (e.g., HistoryView back button) to navigate back to the list view.
 * Handled directly by UiReducer.
 */
export const goBackToList = createAction('[UI] Go Back To List');

// --- Navigation & Selection ---

/**
 * User intent action: Dispatched by ControlsComponent for Prev/Next week buttons.
 * Triggers UiEffects to calculate the new index and dispatch `setCurrentWeekIndex`.
 */
export const navigateWeek = createAction(
  '[UI] Navigate Week',
  props<{ direction: number }>() // -1 for prev, +1 for next
);

/**
 * User intent action: Dispatched by ControlsComponent when jumping to a specific date.
 * Triggers UiEffects to find the corresponding week index and dispatch `setCurrentWeekIndex`.
 */
export const jumpToWeek = createAction(
  '[UI] Jump To Week',
  props<{ date: Date }>()
);

/**
 * Dispatched by UiEffects after calculating the target week index for navigation/jump.
 * Handled directly by UiReducer to update the state.
 */
export const setCurrentWeekIndex = createAction(
  '[UI] Set Current Week Index',
  props<{ index: number }>()
);

/**
 * Dispatched by Effects (e.g., after successful data processing) to reset navigation state.
 * Handled directly by UiReducer.
 */
export const resetNavigation = createAction('[UI] Reset Navigation');

/**
 * Dispatched by ControlsComponent when the entity type dropdown changes.
 * Handled directly by UiReducer.
 */
export const selectEntityType = createAction(
  '[UI] Select Entity Type',
  props<{ entityType: EntityType }>()
);

/**
 * Dispatched by Components (ListComponent, SearchBarComponent) when an item is selected for history view.
 * Handled directly by UiReducer.
 */
export const selectHistoryEntity = createAction(
  '[UI] Select History Entity',
  props<{ key: EntityKey; entityType: EntityType }>()
);

// --- Status Feedback ---

/**
 * Dispatched by Effects or Components to display messages to the user.
 * Handled directly by UiReducer.
 */
export const setStatusMessage = createAction(
  '[UI] Set Status Message',
  props<{ message?: string; isError?: boolean }>()
);

// --- Panels / Modals Visibility ---

/**
 * Dispatched by ControlsComponent to show the settings panel.
 * Handled directly by UiReducer.
 */
export const openSettingsPanel = createAction('[UI] Open Settings Panel');

/**
 * Dispatched by SettingsComponent to hide the settings panel.
 * Handled directly by UiReducer.
 */
export const closeSettingsPanel = createAction('[UI] Close Settings Panel');

/**
 * Dispatched by ExportPreviewModalComponent (on Cancel) or by ExportEffects (after Confirm).
 * Handled directly by UiReducer.
 */
export const closeExportPreview = createAction('[UI] Close Export Preview');
// Note: Opening the Export Preview is triggered by ExportActions.generateExportPreviewSuccess
