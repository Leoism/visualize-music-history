import { inject } from '@angular/core';
import { CanActivateFn, Router, UrlTree } from '@angular/router';
import { Store } from '@ngrx/store';
import { Observable, map, take, filter, combineLatest } from 'rxjs';
import { AppState } from '../store/state/app.state';
import {
  selectProcessedData,
  selectCurrentWeekDateString,
} from '../store/selectors/data.selectors';
import { combineLatestWith, switchMap } from 'rxjs/operators';
import { selectSelectedEntityType } from '../store/selectors/ui.selectors';
import { EntityType } from '../common/interfaces/data.interfaces';

export const latestChartWeekRouteGuard: CanActivateFn = (): Observable<
  boolean | UrlTree // Will always resolve to UrlTree if successful
> => {
  const store = inject(Store<AppState>);
  const router = inject(Router);

  console.log('[latestChartWeekRouteGuard] Running (assuming data exists)...');

  return combineLatest([
    store.select(selectCurrentWeekDateString).pipe(take(1)),
    store.select(selectSelectedEntityType).pipe(take(1)),
  ]).pipe(
    map(([dateString, entityType]: [string | undefined, EntityType | null]) => {
      // Check if both values needed for the redirect URL are valid
      // This is a safeguard in case selectors return null unexpectedly even if processedData exists
      if (dateString && entityType) {
        // Both exist, create the redirect UrlTree. The guard returns this UrlTree,
        // causing the router to navigate there and preventing activation of the current ('/charts') route.
        return router.createUrlTree(['/charts', dateString, entityType]);
      } else {
        // Fallback: This theoretically shouldn't be reached if dataExistsRouteGuard passed
        // and your selectors correctly derive values when data is present.
        // But it's safer to have a fallback than potentially letting the guard return true/false incorrectly.
        console.warn(
          '[latestChartWeekRouteGuard] Data expected, but failed to get latest week string or entity type. Redirecting to /file-upload.'
        );
        return router.createUrlTree(['/file-upload']);
      }
    }) // End map
  ); // End pipe
};
