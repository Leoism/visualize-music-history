import { inject } from '@angular/core';
import { CanActivateFn, Router, UrlTree } from '@angular/router';
import { Store } from '@ngrx/store';
import { Observable, map, take, filter } from 'rxjs';
import { AppState } from '../store/state/app.state';
import {
  selectProcessedData,
  selectCurrentWeekDateString,
} from '../store/selectors/data.selectors';
import { switchMap } from 'rxjs/operators';

export const latestChartWeekRouteGuard: CanActivateFn = (): Observable<
  boolean | UrlTree
> => {
  const store = inject(Store<AppState>);
  const router = inject(Router);

  return store.select(selectProcessedData).pipe(
    take(1),
    switchMap(() => store.select(selectCurrentWeekDateString).pipe(take(1))),
    map((latestWeekId) => {
      if (latestWeekId) {
        return router.createUrlTree(['/charts', latestWeekId]);
      } else {
        console.warn(
          '[LatestChartWeekRouteGuard] Data found, but failed to get latest week ID. Redirecting to /file-upload.'
        );
        return router.createUrlTree(['/file-upload']);
      }
    })
  );
};
