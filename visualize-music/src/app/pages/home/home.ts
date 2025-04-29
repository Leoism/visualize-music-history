import { Component, Input } from '@angular/core';
import { Store } from '@ngrx/store';
import { ChartContainerComponent } from '../../components/chart_container/chart_container';
import {
  selectListDataForCurrentWeek,
  selectCurrentWeekDateString,
} from '../../store/selectors/data.selectors';
import { AppState } from '../../store/state/app.state';
import { AsyncPipe } from '@angular/common';
import { Subject, takeUntil } from 'rxjs';
import * as ControlsActions from '../../store/actions/controls.actions';
import { ControlsComponent } from './controls/controls';
import { Router } from '@angular/router';
import { selectSelectedEntityType } from '../../store/selectors/ui.selectors';

@Component({
  selector: 'app-home-page',
  imports: [ChartContainerComponent, AsyncPipe, ControlsComponent],
  templateUrl: './home.ng.html',
})
export class HomePage {
  private _weekId: string | undefined;

  currentWeekData$ = this.store.select(selectListDataForCurrentWeek);
  currentWeekDate$ = this.store.select(selectCurrentWeekDateString);
  entityType = this.store.select(selectSelectedEntityType);

  @Input()
  set weekId(value: string | undefined) {
    if (value && value !== this._weekId) {
      console.log('[HomePage] weekId input set:', value);
      this._weekId = value;
      this.store.dispatch(
        ControlsActions.syncWeekFromUrl({ weekIdString: this._weekId })
      );
    }
  }
  get weekId(): string | undefined {
    return this._weekId;
  }

  constructor(private store: Store<AppState>) {}
}
