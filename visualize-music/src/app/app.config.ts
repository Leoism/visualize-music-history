import { ApplicationConfig, importProvidersFrom } from '@angular/core';
import { provideRouter } from '@angular/router';

import { provideStore, StoreModule } from '@ngrx/store';
import { routes } from './app.routes';
import { appReducers } from './store/reducers';

export const appConfig: ApplicationConfig = {
  providers: [
    provideRouter(routes),
    provideStore(),
    importProvidersFrom(StoreModule.forRoot(appReducers)),
  ],
};
