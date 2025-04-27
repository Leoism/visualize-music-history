// src/app/store/actions/settings.actions.ts

import { createAction, props } from '@ngrx/store';
import { Settings } from '../../common/interfaces/settings.interface'; // Adjust path if needed

/**
 * Dispatched by the SettingsComponent when the user applies new settings.
 * Carries the complete new settings object.
 * Handled by SettingsReducer to update the state, and potentially by DataEffects
 * to trigger reprocessing if necessary.
 */
export const applySettings = createAction(
  '[Settings] Apply Settings',
  props<{ settings: Settings }>()
);
