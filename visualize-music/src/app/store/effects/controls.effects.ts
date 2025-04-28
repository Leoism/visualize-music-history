// src/app/store/effects/data.effects.ts
import { Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { Store } from '@ngrx/store';
import { of } from 'rxjs'; // Import from and Observable
import { filter, map, switchMap, tap, withLatestFrom } from 'rxjs/operators';
import * as ControlsActions from '../actions/controls.actions'; // Import your data actions
import {
  selectAllWeeks,
  selectCurrentWeekDateString,
} from '../selectors/data.selectors';
import { selectCurrentWeekIndex } from '../selectors/ui.selectors';
import { AppState } from '../state/app.state';
import { formatDateKey, getWeekStartDate } from '../../common/utils/date_utils';

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
        if (nextWeekIndex >= allWeeks.length - 1 || nextWeekIndex < 0) {
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
        if (prevWeekIndex >= allWeeks.length - 1 || prevWeekIndex < 0) {
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
          // Maybe dispatch setStatusMessage with an error?
          return of(); // No action if date not found
        }
      })
    )
  );

  updateCurrentWeekIndex$ = createEffect(
    () =>
      this.actions$.pipe(
        ofType(ControlsActions.updateCurrentWeekIndex),
        withLatestFrom(this.store.select(selectCurrentWeekDateString)),
        filter(([action, dateString]) => !!dateString),
        tap(([action, dateString]) => {
          this.router.navigate(['/charts', dateString], { replaceUrl: true });
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
      switchMap(([action, allWeeks, currentIndex]) => {
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
          return of(
            ControlsActions.updateCurrentWeekIndex({
              weekIndex: targetIndex,
            })
          );
        }
        return of();
      })
    )
  );
}
