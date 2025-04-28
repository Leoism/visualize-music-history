import { ApplicationConfig, importProvidersFrom } from '@angular/core';
import { provideRouter, withComponentInputBinding } from '@angular/router';

import { provideEffects } from '@ngrx/effects';
import { provideStore, StoreModule } from '@ngrx/store';
import { routes } from './app.routes';
import { FileUploadEffects } from './store/effects/file_upload_effects';
import { appReducers } from './store/reducers';
import { DataEffects } from './store/effects/data.effects';

export const appConfig: ApplicationConfig = {
  providers: [
    provideRouter(routes, withComponentInputBinding()),
    provideStore(),
    importProvidersFrom(StoreModule.forRoot(appReducers)),
    provideEffects([FileUploadEffects, DataEffects]),
  ],
};
