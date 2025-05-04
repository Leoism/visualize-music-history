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
import { Store } from '@ngrx/store';
import { Card } from 'primeng/card';
import { map, Observable, of } from 'rxjs';
import {
  EntityKey,
  EntityType,
  ProcessedArtistData,
  ProcessedTrackData,
} from '../../common/interfaces/data.interfaces';
import {
  selectArtistByIdSelectorFactory,
  selectTrackByIdSelectorFactory,
} from '../../store/selectors/data.selectors';
import { formatDateKey } from '../../common/utils/date_utils';
import { RouterLink } from '@angular/router';

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
    return `/charts/${this.entityType}/${week}`;
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
    const firstChartedOn = formatDateKey(data.history[0].week ?? '');
    const lastChartedOn = formatDateKey(
      data.history[data.history.length - 1].week ?? ''
    );
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
}
