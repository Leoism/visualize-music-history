import { AsyncPipe } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  inject,
  Input,
  OnChanges,
  OnInit,
  SimpleChanges,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { Store } from '@ngrx/store';
import { map, Observable, of } from 'rxjs';
import {
  EntityKey,
  EntityType,
  HistoryGroupedByYear,
  ProcessedArtistData,
  ProcessedTrackData,
} from '../../common/interfaces/data.interfaces';
import { formatDateKey } from '../../common/utils/date_utils';
import {
  selectArtistByIdSelectorFactory,
  selectTrackByIdSelectorFactory,
} from '../../store/selectors/data.selectors';
import { compareAsc } from 'date-fns';

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
  totalPlays: number;
  firstPlayedOn: string; // YYYY-MM-DD
  lastPlayedOn: string; // YYYY-MM-DD
  firstChartedOn: string; // YYYY-MM-DD
  lastChartedOn: string; // YYYY-MM-DD
  peakedAt: number;
  peakWeek: string; // YYYY-MM-DD
  topTracks?: CondensedTrackDetails[]; // only for artists
  artistOverview?: CondensedArtistDetails; // only for tracks
}

@Component({
  selector: 'app-details-page',
  imports: [AsyncPipe, RouterLink],
  templateUrl: './details.ng.html',
  styleUrls: ['details.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DetailsPage implements OnInit, OnChanges {
  private readonly store = inject(Store);

  @Input() id: EntityKey = '';
  @Input() entityType?: EntityType;

  enrichedEntity$!: Observable<EnrichedEntityDetails | undefined>;

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
    } else {
      this.enrichedEntity$ = of(undefined);
    }
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
    return {
      totalPlays,
      firstPlayedOn: firstPlayedOn ?? '',
      lastPlayedOn: lastPlayedOn ?? '',
      firstChartedOn: firstChartedOn ?? '',
      lastChartedOn: lastChartedOn ?? '',
      peakedAt: peakedAt ?? 101,
      peakWeek: peakWeek ?? '',
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
