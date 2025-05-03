// src/app/store/reducers/settings.reducer.ts

import { createReducer, on } from '@ngrx/store';
import * as SettingsActions from '../actions/settings.actions';
import { SettingsState, initialSettingsState } from '../state/settings.state';

export const settingsReducer = createReducer(
  initialSettingsState,

  on(SettingsActions.applySettings, (state, { settings }): SettingsState => {
    return {
      ...state,
      settings,
    };
  })
);
