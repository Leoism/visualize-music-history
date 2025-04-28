import { ApplicationConfig, importProvidersFrom } from '@angular/core';
import {
  provideRouter,
  withComponentInputBinding,
  withHashLocation,
} from '@angular/router';

import { provideEffects } from '@ngrx/effects';
import { provideStore, StoreModule } from '@ngrx/store';
import { routes } from './app.routes';
import { FileUploadEffects } from './store/effects/file_upload_effects';
import { appReducers } from './store/reducers';
import { DataEffects } from './store/effects/data.effects';
import { ControlsEffects } from './store/effects/controls.effects';
import { StoreDevtoolsModule } from '@ngrx/store-devtools';

export const appConfig: ApplicationConfig = {
  providers: [
    provideRouter(routes, withComponentInputBinding(), withHashLocation()),
    provideStore(),
    importProvidersFrom(
      StoreModule.forRoot(appReducers),
      StoreDevtoolsModule.instrument({
        maxAge: 25, // Retains last 25 states
        logOnly: false, // Restrict extension to log-only mode
        autoPause: false, // Pauses recording actions and state changes when the extension window is not open
      })
    ),
    provideEffects([FileUploadEffects, DataEffects, ControlsEffects]),
  ],
};
