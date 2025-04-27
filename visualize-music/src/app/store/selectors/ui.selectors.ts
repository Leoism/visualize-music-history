// src/app/store/selectors/ui.selectors.ts

import { createFeatureSelector, createSelector } from '@ngrx/store';
import { formatDateKey } from '../../common/utils/date_utils'; // Import date utility
import { EntityKey, EntityType } from '../../common/interfaces/data.interfaces'; // Adjust path if needed
import { UiState } from '../state/ui.state'; // Adjust path if needed
import { selectAllWeeks } from '../selectors/data.selectors'; // Import selector from data domain

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
  (state: UiState): EntityType => state.selectedEntityType
);

export const selectSelectedHistoryEntity = createSelector(
  selectUiState,
  (state: UiState): { key: EntityKey; type: EntityType } | null =>
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

/** Selects the Date object for the currently selected week, or null */
export const selectCurrentWeekDate = createSelector(
  selectAllWeeks, // From data.selectors
  selectCurrentWeekIndex,
  (allWeeks: Date[], weekIndex: number): Date | null => {
    if (!allWeeks || allWeeks.length === 0) {
      return null;
    }
    const maxIndex = allWeeks.length - 1;
    const targetIndex = weekIndex === -1 ? maxIndex : weekIndex;

    if (targetIndex >= 0 && targetIndex <= maxIndex) {
      return allWeeks[targetIndex];
    }
    return null; // Index out of bounds
  }
);

/** Selects the formatted date string (yyyy-MM-dd) for the current week, or null */
export const selectCurrentWeekDateString = createSelector(
  selectCurrentWeekDate,
  (date: Date | null): string | null => (date ? formatDateKey(date) : null)
);

/** Selects whether the "Previous Week" navigation should be enabled */
export const selectCanNavigatePrev = createSelector(
  selectAllWeeks, // From data.selectors
  selectCurrentWeekIndex,
  (allWeeks: Date[], weekIndex: number): boolean => {
    if (!allWeeks || allWeeks.length === 0) {
      return false;
    }
    const maxIndex = allWeeks.length - 1;
    const currentIndex = weekIndex === -1 ? maxIndex : weekIndex;
    return currentIndex > 0;
  }
);

/** Selects whether the "Next Week" navigation should be enabled */
export const selectCanNavigateNext = createSelector(
  selectAllWeeks, // From data.selectors
  selectCurrentWeekIndex,
  (allWeeks: Date[], weekIndex: number): boolean => {
    if (!allWeeks || allWeeks.length === 0) {
      return false;
    }
    const maxIndex = allWeeks.length - 1;
    // Cannot navigate forward if already at the latest week (-1 or maxIndex)
    return weekIndex !== -1 && weekIndex < maxIndex;
  }
);
