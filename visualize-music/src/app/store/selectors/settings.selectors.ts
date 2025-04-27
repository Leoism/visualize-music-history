import { createFeatureSelector, createSelector } from '@ngrx/store';
import { Settings } from '../../common/interfaces/settings.interface';
import { SettingsState } from '../state/settings.state'; // Adjust path if needed

export const selectSettingsState =
  createFeatureSelector<SettingsState>('settings');

export const selectWindowDuration = createSelector(
  selectSettingsState,
  (state: SettingsState): number => state.settings.windowDuration
);

export const selectWindowUnit = createSelector(
  selectSettingsState,
  (state: SettingsState): string => state.settings.windowUnit
);
export const selectExportCount = createSelector(
  selectSettingsState,
  (state: SettingsState): number => state.settings.exportCount
);
export const selectIsAllTimeMode = createSelector(
  selectSettingsState,
  (state: SettingsState): boolean => state.settings.isAllTimeMode
);
export const selectSettings = createSelector(
  selectSettingsState,
  (state: SettingsState): Settings => state.settings
);
