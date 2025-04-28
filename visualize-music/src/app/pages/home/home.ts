import { Component, Input } from '@angular/core';
import { Store } from '@ngrx/store';
import { ChartContainerComponent } from '../../components/chart_container/chart_container';
import {
  selectListDataForCurrentWeek,
  selectCurrentWeekDateString,
} from '../../store/selectors/data.selectors';
import { AppState } from '../../store/state/app.state';
import { AsyncPipe } from '@angular/common';

@Component({
  selector: 'app-home-page',
  imports: [ChartContainerComponent, AsyncPipe],
  templateUrl: './home.ng.html',
})
export class HomePage {
  @Input() weekId?: string;

  currentWeekData$ = this.store.select(selectListDataForCurrentWeek);
  currentWeekDate$ = this.store.select(selectCurrentWeekDateString);

  constructor(private store: Store<AppState>) {}
}
