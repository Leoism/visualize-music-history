// src/app/store/selectors/ui.selectors.ts

import { createFeatureSelector, createSelector } from '@ngrx/store';
import { EntityKey, EntityType } from '../../common/interfaces/data.interfaces'; // Adjust path if needed
import { UiState } from '../state/ui.state'; // Adjust path if needed

// 1. Feature Selector for the UI slice of the state
export const selectUiState = createFeatureSelector<UiState>('ui'); // 'ui' must match the key in appReducers

// 2. Basic Selectors for individual properties of UiState
export const selectCurrentView = createSelector(
  selectUiState,
  (state: UiState): 'upload' | 'list' | 'history' => state.currentView
);

export const selectCurrentWeekIndex = createSelector(
  selectUiState,
  (state: UiState): number => state.currentWeekIndex
);

export const selectSelectedEntityType = createSelector(
  selectUiState,
  (state: UiState): EntityType => {
    console.log('oink');
    return state.selectedEntityType;
  }
);

export const selectSelectedHistoryEntity = createSelector(
  selectUiState,
  (state: UiState): { key: EntityKey; entityType: EntityType } | null =>
    state.selectedHistoryEntity
);

export const selectStatusMessage = createSelector(
  selectUiState,
  (state: UiState): string | null => state.statusMessage
);

export const selectIsErrorStatus = createSelector(
  selectUiState,
  (state: UiState): boolean => state.isErrorStatus
);

export const selectIsSettingsPanelOpen = createSelector(
  selectUiState,
  (state: UiState): boolean => state.isSettingsPanelOpen
);

export const selectIsExportPreviewOpen = createSelector(
  selectUiState,
  (state: UiState): boolean => state.isExportPreviewOpen
);

// 3. Derived Selectors (combining UI state or UI + other states)

/** Selects whether the application is currently in the list view mode */
export const selectIsListView = createSelector(
  selectCurrentView,
  (currentView): boolean => currentView === 'list'
);

/** Selects whether the application is currently in the history view mode */
export const selectIsHistoryView = createSelector(
  selectCurrentView,
  selectSelectedHistoryEntity,
  (currentView, selectedEntity): boolean =>
    currentView === 'history' && !!selectedEntity
  // Alternative/safer check: just based on selected entity
  // (selectedEntity): boolean => !!selectedEntity
);
