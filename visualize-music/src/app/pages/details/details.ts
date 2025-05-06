import { AsyncPipe } from '@angular/common';
import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  DestroyRef,
  inject,
  Input,
  OnChanges,
  OnInit,
  SimpleChanges,
} from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { Store } from '@ngrx/store';
import { ChartData, ChartOptions } from 'chart.js';
import { compareAsc } from 'date-fns';
import { ChartModule } from 'primeng/chart';
import { combineLatestWith, map, Observable, of } from 'rxjs';
import {
  EntityKey,
  EntityType,
  HistoryEntry,
  HistoryGroupedByYear,
  ProcessedArtistData,
  ProcessedTrackData,
} from '../../common/interfaces/data.interfaces';
import { formatDateKey } from '../../common/utils/date_utils';
import { historyMapToArray } from '../../common/utils/utils';
import {
  selectAllWeeks,
  selectArtistByIdSelectorFactory,
  selectTrackByIdSelectorFactory,
} from '../../store/selectors/data.selectors';

interface CondensedArtistDetails {
  name: string;
  key: EntityKey;
  firstPlayedOn: string; // YYYY-MM-DD
  lastPlayedOn: string; // YYYY-MM-DD
}

interface CondensedTrackDetails {
  name: string;
  key: EntityKey;
  totalPlays: number;
  peak: number;
  peakWeek: string; // YYYY-MM-DD
}

interface EnrichedEntityDetails {
  name: string;
  totalPlays: number;
  firstPlayedOn: string; // YYYY-MM-DD
  lastPlayedOn: string; // YYYY-MM-DD
  firstChartedOn: string; // YYYY-MM-DD
  lastChartedOn: string; // YYYY-MM-DD
  peakedAt: number;
  peakWeek: string; // YYYY-MM-DD
  history: HistoryEntry[];
  topTracks?: CondensedTrackDetails[]; // only for artists
  artistOverview?: CondensedArtistDetails; // only for tracks
}

@Component({
  selector: 'app-details-page',
  imports: [AsyncPipe, RouterLink, ChartModule],
  templateUrl: './details.ng.html',
  styleUrls: ['details.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DetailsPage implements OnInit, OnChanges {
  private readonly store = inject(Store);
  private readonly changeDetectorRef = inject(ChangeDetectorRef);
  private readonly destroyRef = inject(DestroyRef);
  private readonly router = inject(Router);
  private internalAllWeeks?: Date[];

  @Input() id: EntityKey = '';
  @Input() entityType?: EntityType;

  enrichedEntity$!: Observable<EnrichedEntityDetails | undefined>;

  allWeeks$ = this.store.select(selectAllWeeks);

  historicalData$?: Observable<ChartData | undefined>;
  options: ChartOptions = {
    maintainAspectRatio: false,
    aspectRatio: 0.6,
    scales: {
      y: {
        min: 1,
        max: 100,
        reverse: true,
        ticks: {
          stepSize: 10,
        },
      },
      x: {
        time: {
          unit: 'day',
          parser: 'yyyy-MM-dd',
        },
        ticks: {
          stepSize: 50,
        },
      },
    },
  };

  ngOnInit() {
    this.initializeEntityObservable();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['id'] || changes['entityType']) {
      this.initializeEntityObservable();
    }
  }

  craftLink(week: string) {
    return ['/charts', week, this.entityType];
  }

  onDataSelect(point: any) {
    console.log(point);
    const lookupIndex = point?.element?.index;
    if (lookupIndex && this.internalAllWeeks) {
      const week = formatDateKey(this.internalAllWeeks[lookupIndex]);
      this.router.navigate(['/charts', week, this.entityType]);
    }
  }

  private initializeEntityObservable(): void {
    if (this.entityType === 'tracks' && this.id) {
      this.enrichedEntity$ = this.store
        .select(selectTrackByIdSelectorFactory(this.id))
        .pipe(
          map((data) => {
            if (data) {
              return this.createBaseEnrichedDetails(data);
            }
            return undefined;
          })
        );
      this.historicalData$ = this.enrichedEntity$.pipe(
        combineLatestWith(this.allWeeks$),
        map(([entity, allWeeks]) => {
          console.log(this.craftChartJsData(entity, allWeeks));
          return this.craftChartJsData(entity, allWeeks);
        })
      );
    } else if (this.entityType === 'artists' && this.id) {
      this.enrichedEntity$ = this.store
        .select(selectArtistByIdSelectorFactory(this.id))
        .pipe(
          map((data) => {
            if (data) {
              return this.createBaseEnrichedDetails(data);
            }
            return undefined;
          })
        );
      this.historicalData$ = this.enrichedEntity$.pipe(
        combineLatestWith(this.allWeeks$),
        map(([entity, allWeeks]) => {
          return this.craftChartJsData(entity, allWeeks);
        })
      );
    } else {
      this.enrichedEntity$ = of(undefined);
    }
    const sub = this.allWeeks$?.subscribe((data) => {
      this.internalAllWeeks = data;
    });
    this.destroyRef.onDestroy(() => {
      sub?.unsubscribe();
    });
  }

  private createBaseEnrichedDetails(
    data: ProcessedArtistData | ProcessedTrackData
  ): EnrichedEntityDetails {
    const totalPlays = data.details.totalPlays;
    const firstPlayedOn = formatDateKey(data.details.firstPlayDate ?? '');
    const lastPlayedOn = formatDateKey(data.details.lastPlayDate ?? '');
    const firstChartedOn = this.getEarliestEntry(data.history);
    const lastChartedOn = this.getLatestEntry(data.history);
    const peakedAt = data.details.peakedAt;
    const peakWeek = formatDateKey(data.details.peakDate ?? '');
    const history = historyMapToArray(data.history);
    const name =
      'trackName' in data.details
        ? data.details.trackName!
        : data.details.artistName!;

    return {
      name,
      totalPlays,
      firstPlayedOn: firstPlayedOn ?? '',
      lastPlayedOn: lastPlayedOn ?? '',
      firstChartedOn: firstChartedOn ?? '',
      lastChartedOn: lastChartedOn ?? '',
      peakedAt: peakedAt ?? 101,
      peakWeek: peakWeek ?? '',
      history,
    };
  }

  private craftChartJsData(
    entity: EnrichedEntityDetails | undefined,
    allWeeks: Date[]
  ): ChartData | undefined {
    if (!entity) {
      return;
    }
    const history = entity?.history;
    const weekToIndex = new Map<string, number>();
    const labels = [];
    const dataset = [];
    for (let i = 0; i < allWeeks.length; i++) {
      const label = formatDateKey(allWeeks[i])!;
      labels.push(label);
      weekToIndex.set(label, i);
    }
    const datasetLabel = entity.name;
    console.log(history);
    for (const entry of history) {
      const historyWeek = formatDateKey(entry.week)!;
      const indexToInsert = weekToIndex.get(historyWeek)!; // this should always be true and if it's not, then there is a bug
      dataset[indexToInsert] = entry.rank;
    }

    console.log('fjkjkdfsjfsfjsdjfl12312321');
    this.changeDetectorRef.markForCheck();
    return {
      labels,
      datasets: [
        {
          label: datasetLabel,
          data: dataset,
        },
      ],
    };
  }

  private getEarliestEntry(history: HistoryGroupedByYear): string {
    let earliestYearKey = Infinity;
    let earliestWeekKey = '3000-01-01';
    history.years.forEach((value, key) => {
      if (key < earliestYearKey) {
        earliestYearKey = key;
      }
    });
    history.years.get(earliestYearKey)?.weeks.forEach((value, key) => {
      if (compareAsc(key, earliestWeekKey) < 0) {
        earliestWeekKey = key;
      }
    });

    return formatDateKey(earliestWeekKey) ?? '';
  }

  private getLatestEntry(history: HistoryGroupedByYear): string {
    let latestYearKey = -Infinity;
    let latestWeekKey = '0000-01-01';
    history.years.forEach((value, key) => {
      if (key > latestYearKey) {
        latestYearKey = key;
      }
    });
    history.years.get(latestYearKey)?.weeks.forEach((value, key) => {
      if (compareAsc(key, latestWeekKey) > 0) {
        latestWeekKey = key;
      }
    });

    return formatDateKey(latestWeekKey) ?? '';
  }
}
