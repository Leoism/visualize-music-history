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

@Component({
  selector: 'app-home-page',
  imports: [ChartContainerComponent, AsyncPipe],
  templateUrl: './home.ng.html',
})
export class HomePage {
  private destroy$ = new Subject<void>();
  private _weekId: string | undefined;
  private currentStoreWeekId?: string;

  @Input()
  set weekId(value: string | undefined) {
    if (value && value !== this._weekId) {
      console.log('[HomePage] weekId input set:', value);
      this._weekId = value;
      if (this._weekId && this._weekId !== this.currentStoreWeekId) {
        console.log('[HomePage] Dispatching syncWeekFromUrl:', this._weekId);
        this.store.dispatch(
          ControlsActions.syncWeekFromUrl({ weekIdString: this._weekId })
        );
      }
    }
  }
  get weekId(): string | undefined {
    return this._weekId;
  }

  currentWeekData$ = this.store.select(selectListDataForCurrentWeek);
  currentWeekDate$ = this.store.select(selectCurrentWeekDateString);

  constructor(private store: Store<AppState>) {}

  ngOnInit(): void {
    this.store
      .select(selectCurrentWeekDateString)
      .pipe(takeUntil(this.destroy$))
      .subscribe((storeDateString) => {
        this.currentStoreWeekId = storeDateString;
        if (this._weekId && this._weekId !== this.currentStoreWeekId) {
          console.log(
            '[HomePage] ngOnInit check: URL differs from store. Dispatching syncWeekFromUrl:',
            this._weekId
          );
          this.store.dispatch(
            ControlsActions.syncWeekFromUrl({ weekIdString: this._weekId })
          );
        }
      });

    // Initial check in case input setter ran before subscription
    if (this._weekId && this._weekId !== this.currentStoreWeekId) {
      console.log('[HomePage] ngOnInit initial dispatch check:', this._weekId);
      this.store.dispatch(
        ControlsActions.syncWeekFromUrl({ weekIdString: this._weekId })
      );
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
