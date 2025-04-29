import { ChangeDetectionStrategy, Component } from '@angular/core';

import { CommonModule } from '@angular/common';
import { Store } from '@ngrx/store';
import { AppState } from '../../../store/state/app.state';
import { combineLatestWith, map, withLatestFrom } from 'rxjs';
import {
  jumpToWeekRequest,
  nextWeekRequest,
  prevWeekRequest,
} from '../../../store/actions/controls.actions';
import { formatDateKey } from '../../../common/utils/date_utils';
import { parseISO } from 'date-fns';
import { selectExportCount } from '../../../store/selectors/settings.selectors';
import {
  selectCurrentWeekIndex,
  selectSelectedEntityType,
} from '../../../store/selectors/ui.selectors';
import {
  selectAllWeeks,
  selectCurrentWeekDateString,
} from '../../../store/selectors/data.selectors';
import { updateSelectedEntityType } from '../../../store/actions/ui.actions';
import { EntityType } from '../../../common/interfaces/data.interfaces';
import { FormsModule, NgModel } from '@angular/forms';

@Component({
  selector: 'app-chart-controls',
  templateUrl: './controls.ng.html',
  styleUrls: ['./controls.scss'],
  imports: [CommonModule, FormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: true,
})
export class ControlsComponent {
  currentWeekIndex$ = this.store.select(selectCurrentWeekIndex);
  allWeeks$ = this.store.select(selectAllWeeks);
  currentWeekString$ = this.store.select(selectCurrentWeekDateString);
  exportCount$ = this.store.select(selectExportCount);
  selectedEntityType$ = this.store.select(selectSelectedEntityType);

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

  updateEntityType(event: Event) {
    const selectElement = event.target as HTMLSelectElement;
    if (selectElement.value !== 'tracks' && selectElement.value !== 'artists') {
      console.error('Invalid entity type selected:', selectElement.value);
      return;
    }
    const selectedValue = selectElement.value as EntityType;

    // Dispatch an action to update the entity type in the store
    this.store.dispatch(
      updateSelectedEntityType({ entityType: selectedValue })
    );
  }
}
