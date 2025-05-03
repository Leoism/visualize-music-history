import { AsyncPipe } from '@angular/common';
import { Component, inject, Input } from '@angular/core';
import { Store } from '@ngrx/store';
import { MessageService } from 'primeng/api';
import { EntityType } from '../../common/interfaces/data.interfaces';
import { ChartContainerComponent } from '../../components/chart_container/chart_container';
import { SearchBarComponent } from '../../components/search_bar/search_bar';
import * as ControlsActions from '../../store/actions/controls.actions';
import {
  selectCurrentWeekDateString,
  selectListDataForCurrentWeek,
} from '../../store/selectors/data.selectors';
import { selectSelectedEntityType } from '../../store/selectors/ui.selectors';
import { AppState } from '../../store/state/app.state';
import { ControlsComponent } from './controls/controls';

@Component({
  selector: 'app-home-page',
  imports: [
    ChartContainerComponent,
    AsyncPipe,
    ControlsComponent,
    SearchBarComponent,
  ],
  templateUrl: './home.ng.html',
})
export class HomePage {
  private readonly unused = inject(MessageService);
  private readonly store = inject(Store<AppState>);

  private _weekId: string | undefined;
  private _entityType: string | undefined;

  currentWeekData$ = this.store.select(selectListDataForCurrentWeek);
  currentWeekDate$ = this.store.select(selectCurrentWeekDateString);
  entityType$ = this.store.select(selectSelectedEntityType);

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

  @Input()
  set entityType(value: string | undefined) {
    // Basic validation
    const validEntityType = (
      value === 'tracks' || value === 'artists' ? value : 'tracks'
    ) as EntityType;
    if (validEntityType && validEntityType !== this._entityType) {
      console.log('[HomePage] entityType input set:', validEntityType);
      this._entityType = validEntityType;
      // Dispatch a new action to sync entity type from URL
      this.store.dispatch(
        ControlsActions.syncEntityTypeFromUrl({ entityType: validEntityType })
      );
    }
  }
  get entityType(): string | undefined {
    return this._entityType;
  }
}
