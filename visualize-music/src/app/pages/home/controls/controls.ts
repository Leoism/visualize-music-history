import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  inject,
  Input,
} from '@angular/core';

import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { Store } from '@ngrx/store';
import { parseISO } from 'date-fns';
import { ButtonModule } from 'primeng/button';
import { DatePickerModule } from 'primeng/datepicker';
import { combineLatestWith, map } from 'rxjs';
import {
  ChartItem,
  EntityType,
} from '../../../common/interfaces/data.interfaces';
import { formatDateKey } from '../../../common/utils/date_utils';
import {
  jumpToWeekRequest,
  nextWeekRequest,
  prevWeekRequest,
} from '../../../store/actions/controls.actions';
import { updateSelectedEntityType } from '../../../store/actions/ui.actions';
import {
  selectAllWeeks,
  selectCurrentWeekDateString,
} from '../../../store/selectors/data.selectors';
import { selectExportCount } from '../../../store/selectors/settings.selectors';
import {
  selectCurrentWeekIndex,
  selectSelectedEntityType,
} from '../../../store/selectors/ui.selectors';
import { AppState } from '../../../store/state/app.state';
import { ExportChartComponent } from './export_chart/export_chart';

@Component({
  selector: 'app-chart-controls',
  templateUrl: './controls.ng.html',
  styleUrls: ['./controls.scss'],
  imports: [
    CommonModule,
    FormsModule,
    ExportChartComponent,
    ButtonModule,
    RouterModule,
    DatePickerModule,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: true,
})
export class ControlsComponent {
  private readonly store = inject(Store<AppState>);
  private readonly destroyRef = inject(DestroyRef);

  @Input() currentWeekData: ChartItem[] = [];

  currentWeekIndex$ = this.store.select(selectCurrentWeekIndex);
  allWeeks$ = this.store.select(selectAllWeeks);
  currentWeekString$ = this.store.select(selectCurrentWeekDateString);
  exportCount$ = this.store.select(selectExportCount);
  selectedEntityType$ = this.store.select(selectSelectedEntityType);

  minDateRange$ = this.allWeeks$.pipe(
    map((allWeeks) => {
      return allWeeks[0];
    })
  );

  maxDateRange$ = this.allWeeks$.pipe(
    map((allWeeks) => {
      return allWeeks[allWeeks.length - 1];
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

  calendarSelectedDate: Date = new Date();

  constructor() {
    const sub = this.currentWeekString$.subscribe((currentWeek) => {
      if (currentWeek) {
        this.calendarSelectedDate = this.toDate(currentWeek);
      }
    });
    this.destroyRef.onDestroy(() => {
      sub.unsubscribe();
    });
  }

  updateCalendarSelection(event: Event) {
    const input = event.target as HTMLInputElement;
    this.calendarSelectedDate = this.toDate(input.value);
  }

  handleJumpToWeek() {
    if (!this.calendarSelectedDate) {
      return;
    }

    this.store.dispatch(jumpToWeekRequest({ date: this.calendarSelectedDate }));
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

  toDate(date: string) {
    console.log(parseISO(date + 'T00:00:00'));
    return parseISO(date + 'T00:00:00');
  }
}
