import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  inject,
  Input,
} from '@angular/core';

import { AsyncPipe, CommonModule } from '@angular/common';
import {
  ChartItem,
  PeakStatus,
  RankStatus,
} from '../../../common/interfaces/data.interfaces';
import { Router } from '@angular/router';

@Component({
  selector: 'app-chart-row',
  templateUrl: './chart_row.ng.html',
  styleUrls: ['./chart_row.scss'],
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: true,
})
export class ChartRowComponent implements AfterViewInit {
  private readonly router = inject(Router);

  @Input() item?: ChartItem;
  errors = 0;

  ngAfterViewInit() {
    // console.log(this.item);
  }

  tryFetchImage() {
    const albumId = this.item?.albumMbid;
    const trackId = this.item?.trackMbid;
  }
  getPeakIcon(peakStatus: PeakStatus) {
    let peakIndicatorText = '';
    if (peakStatus === 'PEAK') peakIndicatorText = '▲ Peak';
    else if (peakStatus === 'RE-PEAK') peakIndicatorText = '▲ Re-Peak';

    return peakIndicatorText;
  }

  getRankText(rankStatus: RankStatus) {
    let statusIndicator = '-';

    if (rankStatus === 'NEW') {
      statusIndicator = '★';
    } else if (rankStatus === 'RE-ENTRY') {
      statusIndicator = 'RE';
    } else if (typeof rankStatus === 'number') {
      if (rankStatus > 0) {
        statusIndicator = `▲ ${rankStatus}`;
      } else if (rankStatus < 0) {
        statusIndicator = `▼ ${Math.abs(rankStatus)}`; // Down
      } else {
        statusIndicator = '=';
      }
    }
    return statusIndicator;
  }

  getRankClass(rankStatus: RankStatus) {
    let statusClass = 'list-change-same';

    if (rankStatus === 'NEW') {
      statusClass = 'list-change-new';
    } else if (rankStatus === 'RE-ENTRY') {
      statusClass = 'list-change-re';
    } else if (typeof rankStatus === 'number') {
      if (rankStatus > 0) {
        statusClass = 'list-change-up';
      } else if (rankStatus < 0) {
        statusClass = 'list-change-down';
      } else {
        statusClass = 'list-change-same';
      }
    }
    return statusClass;
  }

  /** Generates image HTML (cover art or placeholder) */
  getImageProperties(): {
    url?: string;
    alt?: string;
    error: (event: Event) => void;
    initials: string;
  } {
    let initials = '?';
    if (this.item?.name && this.item.name !== '-') {
      initials = this.item.name.charAt(0).toUpperCase();
      if (this.item.entityType === 'tracks' && this.item.artistName) {
        initials += this.item.artistName.charAt(0).toUpperCase();
      } else if (
        this.item.entityType === 'artists' &&
        this.item.name.length > 1
      ) {
        initials = this.item.name.substring(0, 2).toUpperCase();
      }
    }
    // Attempt to use Cover Art Archive if it's a track with an album MBID
    if (
      this.item?.entityType === 'tracks' &&
      this.item.albumMbid &&
      this.errors < 1
    ) {
      return {
        url: `https://coverartarchive.org/release/${this.item.albumMbid}/front-250`,
        alt: `Cover Art for ${this.item.name}`,
        initials,
        error: (event: Event) => {
          this.errors += 1;
        },
      };
    } else {
      return {
        initials,
        error: (unused) => {},
      };
    }
  }

  handleRowClick(item: ChartItem) {
    const id = item.key;
    const type = item.entityType;

    this.router.navigate(['/details', type, id]);
  }
}
