import { AsyncPipe, Location } from '@angular/common';
import { Component, DestroyRef, inject, OnInit } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { Store } from '@ngrx/store';
import { CardModule } from 'primeng/card';
import { InputNumberModule } from 'primeng/inputnumber';
import { combineLatestWith, map } from 'rxjs';
import { RankingWindowUnit } from '../../common/interfaces/settings.interface';
import {
  selectExportCount,
  selectWindowDuration,
  selectWindowUnit,
} from '../../store/selectors/settings.selectors';
import { AppState } from '../../store/state/app.state';
import { Select } from 'primeng/select';
import { Button } from 'primeng/button';

@Component({
  selector: 'app-settings-page',
  imports: [
    CardModule,
    ReactiveFormsModule,
    InputNumberModule,
    AsyncPipe,
    Select,
    Button,
  ],
  templateUrl: './settings.ng.html',
  styleUrls: ['./settings.scss'],
})
export class SettingsPage implements OnInit {
  private readonly store = inject(Store<AppState>);
  private readonly destroyRef = inject(DestroyRef);
  private readonly location = inject(Location);

  private readonly windowDuration$ = this.store.select(selectWindowDuration);
  private readonly windowUnit$ = this.store.select(selectWindowUnit);
  private readonly exportCount$ = this.store.select(selectExportCount);

  readonly currentSettings$ = this.windowDuration$.pipe(
    combineLatestWith(this.windowUnit$, this.exportCount$),
    map(([windowDuration, windowUnit, exportCount]) => {
      return {
        windowDuration,
        windowUnit,
        exportCount,
      };
    })
  );
  readonly windowUnitOptions: RankingWindowUnit[] = [
    'weeks',
    'months',
    'years',
    'all-time',
  ];

  formGroup!: FormGroup;

  ngOnInit(): void {
    const sub = this.currentSettings$.subscribe((settings) => {
      this.formGroup = new FormGroup({
        windowDuration: new FormControl(settings.exportCount),
        windowUnit: new FormControl(settings.windowUnit),
        exportCount: new FormControl(settings.exportCount),
      });
    });
    this.destroyRef.onDestroy(() => sub.unsubscribe());
  }

  goBack() {
    this.location.back();
  }
}
