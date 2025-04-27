// src/app/store/reducers/settings.reducer.ts

import { createReducer, on } from '@ngrx/store';
import { SettingsState, initialSettingsState } from '../state/settings.state';
import { Settings } from '../../common/interfaces/settings.interface'; // Adjust path if needed
import * as SettingsActions from '../actions/settings.actions';

export const settingsReducer = createReducer(
  // Initial State
  initialSettingsState,

  /**
   * When new settings are applied:
   * - Replace the entire settings object in the state with the new one from the action payload.
   * - Re-calculate the derived 'isAllTimeMode' flag based on the new settings.
   */
  on(SettingsActions.applySettings, (state, { settings }): SettingsState => {
    // Create the new settings object, ensuring isAllTimeMode is correctly derived
    const newSettings: Settings = {
      ...settings, // Copy incoming duration, unit, exportCount
      isAllTimeMode: settings.windowUnit === 'all-time', // Derive boolean flag
    };
    return {
      ...state, // Spread existing state (in case more properties are added later)
      settings: newSettings, // Update with the complete new settings object
    };
  })
);
