import { inject } from '@angular/core';
import { CanActivateFn, Router, UrlTree } from '@angular/router';
import { Store } from '@ngrx/store';
import { Observable, map, take } from 'rxjs';
import { AppState } from '../store/state/app.state';
import { selectProcessedData } from '../store/selectors/data.selectors';

export const dataExistsRouteGuard: CanActivateFn = (): Observable<
  boolean | UrlTree
> => {
  const store = inject(Store<AppState>);
  const router = inject(Router);

  return store.select(selectProcessedData).pipe(
    take(1),
    map((processedData) => {
      const hasData =
        !!processedData &&
        (processedData.tracks.size > 0 || processedData.artists.size > 0);

      if (hasData) {
        console.log('[DataGuard] Data found, allowing activation.');
        return true;
      } else {
        console.log(
          '[DataGuard] No processed data found, redirecting to /file-upload.'
        );

        return router.createUrlTree(['/file-upload']);
      }
    })
  );
};
