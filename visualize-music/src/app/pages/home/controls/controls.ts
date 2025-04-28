import { ChangeDetectionStrategy, Component } from '@angular/core';

import { CommonModule } from '@angular/common';
import { Store } from '@ngrx/store';
import { AppState } from '../../../store/state/app.state';
import { selectCurrentWeekIndex } from '../../../store/selectors/ui.selectors';
import {
  selectAllWeeks,
  selectCurrentWeekDateString,
} from '../../../store/selectors/data.selectors';
import { combineLatestWith, map, withLatestFrom } from 'rxjs';
import {
  jumpToWeekRequest,
  nextWeekRequest,
  prevWeekRequest,
} from '../../../store/actions/controls.actions';
import { formatDateKey } from '../../../common/utils/date_utils';
import { parseISO } from 'date-fns';

@Component({
  selector: 'app-chart-controls',
  templateUrl: './controls.ng.html',
  styleUrls: ['./controls.scss'],
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: true,
})
export class ControlsComponent {
  currentWeekIndex$ = this.store.select(selectCurrentWeekIndex);
  allWeeks$ = this.store.select(selectAllWeeks);
  currentWeekString$ = this.store.select(selectCurrentWeekDateString);

  minDateRange$ = this.allWeeks$.pipe(
    map((allWeeks) => {
      return formatDateKey(allWeeks[0]);
    })
  );

  maxDateRange$ = this.allWeeks$.pipe(
    map((allWeeks) => {
      return formatDateKey(allWeeks[allWeeks.length - 1]);
    })
  );

  canGoForward$ = this.currentWeekIndex$.pipe(
    combineLatestWith(this.allWeeks$),
    map(([currentWeekIndex, allWeeks]) => {
      const nextIndex = currentWeekIndex + 1;
      return nextIndex < allWeeks.length;
    })
  );

  canGoBackward$ = this.currentWeekIndex$.pipe(
    map((currentWeekIndex) => {
      const nextIndex = currentWeekIndex - 1;
      return 0 <= nextIndex;
    })
  );

  private calendarSelectedDate: string = '';

  constructor(private store: Store<AppState>) {}

  updateCalendarSelection(event: Event) {
    const input = event.target as HTMLInputElement;
    this.calendarSelectedDate = input.value;
  }

  handleJumpToWeek() {
    if (!this.calendarSelectedDate) {
      return;
    }

    const utcDate = parseISO(this.calendarSelectedDate + 'T00:00:00');

    this.store.dispatch(jumpToWeekRequest({ date: utcDate }));
  }

  navigateWeek(direction: 'next' | 'prev') {
    if (direction === 'next') {
      this.store.dispatch(nextWeekRequest());
    } else {
      this.store.dispatch(prevWeekRequest());
    }
  }
}
