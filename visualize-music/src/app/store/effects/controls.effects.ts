// src/app/store/effects/data.effects.ts
import { Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { Store } from '@ngrx/store';
import { of } from 'rxjs'; // Import from and Observable
import {
  distinctUntilChanged,
  filter,
  map,
  switchMap,
  tap,
  withLatestFrom,
} from 'rxjs/operators';
import * as ControlsActions from '../actions/controls.actions'; // Import your data actions
import {
  selectAllWeeks,
  selectCurrentWeekDateString,
} from '../selectors/data.selectors';
import {
  selectCurrentWeekIndex,
  selectSelectedEntityType,
} from '../selectors/ui.selectors';
import { AppState } from '../state/app.state';
import { formatDateKey, getWeekStartDate } from '../../common/utils/date_utils';
import { updateSelectedEntityType } from '../actions/ui.actions';

@Injectable()
export class ControlsEffects {
  constructor(
    private actions$: Actions,
    private store: Store<AppState>,
    private router: Router
  ) {}

  nextWeekRequest$ = createEffect(() =>
    this.actions$.pipe(
      ofType(ControlsActions.nextWeekRequest),
      withLatestFrom(
        this.store.select(selectCurrentWeekIndex),
        this.store.select(selectAllWeeks)
      ),
      switchMap(([action, currentWeekIndex, allWeeks]) => {
        const nextWeekIndex = currentWeekIndex + 1;
        if (nextWeekIndex >= allWeeks.length || nextWeekIndex < 0) {
          // On failure, do not change the week index
          return of(
            ControlsActions.updateCurrentWeekIndex({
              weekIndex: currentWeekIndex,
            })
          );
        }
        return of(
          ControlsActions.updateCurrentWeekIndex({
            weekIndex: nextWeekIndex,
          })
        );
      })
    )
  );

  prevWeekRequest$ = createEffect(() =>
    this.actions$.pipe(
      ofType(ControlsActions.prevWeekRequest),
      withLatestFrom(
        this.store.select(selectCurrentWeekIndex),
        this.store.select(selectAllWeeks)
      ),
      switchMap(([action, currentWeekIndex, allWeeks]) => {
        const prevWeekIndex = currentWeekIndex - 1;
        if (prevWeekIndex >= allWeeks.length || prevWeekIndex < 0) {
          // On failure, do not change the week index
          return of(
            ControlsActions.updateCurrentWeekIndex({
              weekIndex: currentWeekIndex,
            })
          );
        }
        return of(
          ControlsActions.updateCurrentWeekIndex({
            weekIndex: prevWeekIndex,
          })
        );
      })
    )
  );

  jumpToWeekRequest$ = createEffect(() =>
    this.actions$.pipe(
      ofType(ControlsActions.jumpToWeekRequest),
      withLatestFrom(this.store.select(selectAllWeeks)),
      filter(([action, allWeeks]) => allWeeks && allWeeks.length > 0), // Ensure weeks exist
      switchMap(([action, allWeeks]) => {
        const targetDateStr = formatDateKey(getWeekStartDate(action.date)); // Normalize target date
        const targetIndex = allWeeks.findIndex(
          (weekDate) => formatDateKey(weekDate) === targetDateStr
        );

        if (targetIndex !== -1) {
          return of(
            ControlsActions.updateCurrentWeekIndex({
              weekIndex: targetIndex,
            })
          );
        } else {
          console.warn(
            `[UiEffects] jumpToWeek: Date ${targetDateStr} not found in allWeeks.`
          );
          return of();
        }
      })
    )
  );

  updateCurrentWeekIndex$ = createEffect(
    () =>
      this.actions$.pipe(
        ofType(ControlsActions.updateCurrentWeekIndex),
        withLatestFrom(
          this.store.select(selectCurrentWeekDateString),
          this.store.select(selectSelectedEntityType)
        ),
        filter(([action, dateString, selectedEntityType]) => !!dateString),
        distinctUntilChanged(),
        tap(([action, dateString, selectedEntityType]) => {
          this.router.navigate(['/charts', dateString, selectedEntityType], {
            replaceUrl: true,
          });
        })
      ),
    { dispatch: false }
  );

  syncStateFromUrl$ = createEffect(() =>
    this.actions$.pipe(
      ofType(ControlsActions.syncWeekFromUrl),
      withLatestFrom(
        this.store.select(selectAllWeeks),
        this.store.select(selectCurrentWeekIndex)
      ),
      filter(
        ([action, allWeeks, currentIndex]) => allWeeks && allWeeks.length > 0
      ),
      map(([action, allWeeks, currentIndex]) => {
        let targetIndex = -1;
        try {
          const targetDateStr = action.weekIdString;
          targetIndex = allWeeks.findIndex(
            (weekDate) => formatDateKey(weekDate) === targetDateStr
          );
        } catch (e) {
          console.error('Error parsing date string from URL in effect', e);
          targetIndex = allWeeks.length - 1; // Fallback to the last week
        }

        if (targetIndex !== -1 && targetIndex !== currentIndex) {
          console.log(
            `[UiEffects] Found matching index ${targetIndex}. Dispatching setCurrentWeekIndex.`
          );
          return ControlsActions.updateCurrentWeekIndex({
            weekIndex: targetIndex,
          });
        }
        return { type: 'No Op' };
      }),
      filter(
        (action) => action.type === ControlsActions.updateCurrentWeekIndex.type
      )
    )
  );

  syncEntityTypeFromUrl$ = createEffect(() =>
    this.actions$.pipe(
      ofType(ControlsActions.syncEntityTypeFromUrl),
      withLatestFrom(this.store.select(selectSelectedEntityType)), // Get current type from store
      filter(([action, currentStoreType]) => {
        // Only proceed if the type from URL is different from the store
        return action.entityType !== currentStoreType;
      }),
      map(([action, currentStoreType]) => {
        console.log(
          `[UiEffects] Syncing entityType from URL: ${action.entityType}`
        );

        return updateSelectedEntityType({
          entityType: action.entityType,
        });
      })
    )
  );

  updateSelectedEntityType$ = createEffect(
    () =>
      this.actions$.pipe(
        ofType(updateSelectedEntityType),
        withLatestFrom(
          this.store.select(selectCurrentWeekDateString),
          this.store.select(selectSelectedEntityType)
        ),
        map(([action, dateString, entityType]) => ({ dateString, entityType })),
        filter((params) => !!params.dateString && !!params.entityType),
        distinctUntilChanged(
          (prev, curr) =>
            prev.dateString === curr.dateString &&
            prev.entityType === curr.entityType
        ),
        tap(({ dateString, entityType }) => {
          this.router.navigate(['/charts', dateString, entityType], {
            replaceUrl: true,
          });
        })
      ),
    { dispatch: false }
  );
}
