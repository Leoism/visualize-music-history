import { AsyncPipe, Location } from '@angular/common';
import { Component, DestroyRef, inject, OnInit } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { Actions } from '@ngrx/effects';
import { Store } from '@ngrx/store';
import { Button } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { InputNumberModule } from 'primeng/inputnumber';
import { Select, SelectChangeEvent } from 'primeng/select';
import { ToastModule } from 'primeng/toast';
import { combineLatestWith, map, take } from 'rxjs';
import {
  RankingWindowUnit,
  Settings,
} from '../../common/interfaces/settings.interface';
import { calculateDaysFromUnitDuration } from '../../common/utils/utils';
import { applySettings } from '../../store/actions/settings.actions';
import {
  selectExportCount,
  selectWindowDuration,
  selectWindowUnit,
} from '../../store/selectors/settings.selectors';
import { AppState } from '../../store/state/app.state';
import { MessageService } from 'primeng/api';
import {
  selectFirstWeekDate,
  selectLastWeekDate,
} from '../../store/selectors/data.selectors';
import { differenceInWeeks } from 'date-fns';

interface SettingsForm {
  windowDuration: FormControl<number>;
  windowUnit: FormControl<RankingWindowUnit>;
  exportCount: FormControl<number>;
}

@Component({
  selector: 'app-settings-page',
  imports: [
    CardModule,
    ReactiveFormsModule,
    InputNumberModule,
    AsyncPipe,
    Select,
    Button,
    ToastModule,
  ],
  templateUrl: './settings.ng.html',
  styleUrls: ['./settings.scss'],
})
export class SettingsPage implements OnInit {
  private readonly store = inject(Store<AppState>);
  private readonly destroyRef = inject(DestroyRef);
  private readonly location = inject(Location);
  private readonly messageService = inject(MessageService);
  private readonly actions$ = inject(Actions);

  private readonly windowDuration$ = this.store.select(selectWindowDuration);
  private readonly windowUnit$ = this.store.select(selectWindowUnit);
  private readonly exportCount$ = this.store.select(selectExportCount);
  private readonly maxWeeks$ = this.store.select(selectFirstWeekDate).pipe(
    combineLatestWith(this.store.select(selectLastWeekDate)),
    map(([firstWeekDate, lastWeekDate]) => {
      if (!firstWeekDate || !lastWeekDate) {
        return 1300; // defaulting to 1300 weeks which is 25 years
      }
      return differenceInWeeks(lastWeekDate, firstWeekDate) + 1;
    })
  );

  private _currentSettings?: Settings;
  readonly currentSettings$ = this.windowDuration$.pipe(
    combineLatestWith(this.windowUnit$, this.exportCount$),
    map(([windowDuration, windowUnit, exportCount]) => {
      const daysInWeek = calculateDaysFromUnitDuration(
        windowUnit,
        windowDuration
      );
      return {
        windowDuration,
        windowUnit,
        exportCount,
        isAllTimeMode: windowUnit === 'all-time',
        slidingWindowWeeks: daysInWeek ? Math.floor(daysInWeek / 7) : null,
      } as Settings;
    })
  );
  readonly windowUnitOptions: RankingWindowUnit[] = [
    'weeks',
    'months',
    'years',
    'all-time',
  ];

  formGroup!: FormGroup;
  isProcessing: boolean = false;
  windowDurationFormControl!: FormControl<number>;
  windowUnitFormControl!: FormControl<RankingWindowUnit>;
  exportCountFormControl!: FormControl<number>;

  ngOnInit(): void {
    const sub = this.currentSettings$
      .pipe(combineLatestWith(this.maxWeeks$))
      .subscribe(([settings, maxWeeks]) => {
        this._currentSettings = settings;
        this.windowDurationFormControl = new FormControl(
          settings.windowDuration,
          {
            nonNullable: true,
          }
        );
        this.windowDurationFormControl.setValidators([
          (control) => {
            const formWindowUnitValue = this.formGroup.get('windowUnit')?.value;
            if (formWindowUnitValue === 'all-time') {
              return null; // no validation for all-time
            }
            const value = calculateDaysFromUnitDuration(
              formWindowUnitValue,
              control.value
            );
            if (value === null) {
              return null; // yolo it idk
            }
            const inWeeks = Math.floor(value / 7);
            if (inWeeks < 1 || inWeeks > maxWeeks) {
              return { invalidWindowDuration: true };
            }
            return null;
          },
        ]);
        this.windowUnitFormControl = new FormControl(settings.windowUnit, {
          nonNullable: true,
        });
        this.exportCountFormControl = new FormControl(settings.exportCount, {
          nonNullable: true,
        });
        this.exportCountFormControl.setValidators([
          (control) => {
            if (control.value < 1 || control.value > 100) {
              return { invalidExportCount: true };
            }
            return null;
          },
        ]);
        this.formGroup = new FormGroup<SettingsForm>({
          windowDuration: this.windowDurationFormControl,
          windowUnit: this.windowUnitFormControl,
          exportCount: this.exportCountFormControl,
        });
      });
    this.destroyRef.onDestroy(() => sub.unsubscribe());
  }

  goBack() {
    this.location.back();
  }

  onWindowUnitChange(event: SelectChangeEvent) {
    const selectedValue = event.value as RankingWindowUnit;
    if (selectedValue === 'all-time') {
      this.formGroup.get('windowDuration')?.disable();
    }
    this.formGroup.get('windowDuration')?.enable();
  }

  applySettings() {
    if (this.formGroup.invalid) {
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: 'Please fix the errors in the form',
      });
      return;
    }

    const daysInWeeks = calculateDaysFromUnitDuration(
      this.formGroup.value.windowUnit,
      this.formGroup.value.windowDuration
    );
    const newSettings: Settings = {
      windowUnit: this.formGroup.value.windowUnit,
      windowDuration: this.formGroup.value.windowDuration,
      exportCount: this.formGroup.value.exportCount,
      isAllTimeMode: this.formGroup.value.windowUnit === 'all-time',
      slidingWindowWeeks: daysInWeeks ? Math.floor(daysInWeeks / 7) : null,
    };

    if (
      this._currentSettings &&
      this._currentSettings.windowUnit === newSettings.windowUnit &&
      this._currentSettings.windowDuration === newSettings.windowDuration &&
      this._currentSettings.exportCount === newSettings.exportCount
    ) {
      this.messageService.add({
        severity: 'info',
        summary: 'Info',
        detail: 'No changes detected',
      });
      return;
    }

    this.isProcessing = true;
    const fallback$ = this.currentSettings$
      .pipe(
        take(1),
        combineLatestWith(
          this.actions$.pipe(
            map((action) => {
              if (action.type === '[Data] Process Data Success') {
                return true;
              } else if (action.type === '[Data] Process Data Failure') {
                return false;
              }
              return null;
            })
          )
        ),
        map(([currentSettings, didSucceed]) => {
          if (didSucceed === true) {
            this.isProcessing = false;
            this.messageService.add({
              severity: 'success',
              summary: 'Success',
              detail: 'The settings have been applied',
            });
          } else if (didSucceed === false) {
            this.isProcessing = true;
            console.warn(
              'Failed to apply settings, reverting to previous settings'
            );
            this.messageService.add({
              severity: 'error',
              summary: 'Error',
              detail: 'The settings could not be applied',
            });
            // If we failed, then we need to revert to the previous settings
            this.store.dispatch(applySettings({ settings: currentSettings }));
          }
        })
      )
      .subscribe();
    const success$ = this.actions$.subscribe((action) => {
      if (action.type === '[Data] Process Data Success') {
        this.isProcessing = false;
      } else if (action.type === '[Data] Process Data Failure') {
        this.isProcessing = true;
      }
    });
    this.store.dispatch(applySettings({ settings: newSettings }));
    this.destroyRef.onDestroy(() => {
      success$.unsubscribe();
      fallback$.unsubscribe();
    });
  }
}
