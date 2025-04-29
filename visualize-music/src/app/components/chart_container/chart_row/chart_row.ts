import { ChangeDetectionStrategy, Component, Input } from '@angular/core';

import { AsyncPipe, CommonModule } from '@angular/common';
import {
  ChartItem,
  PeakStatus,
  RankStatus,
} from '../../../common/interfaces/data.interfaces';

@Component({
  selector: 'app-chart-row',
  templateUrl: './chart_row.ng.html',
  styleUrls: ['./chart_row.scss'],
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: true,
})
export class ChartRowComponent {
  @Input() item?: ChartItem;
  constructor() {}

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
    // Sanitize initials for use in JS string literal within onerror
    const safeInitials = initials.replace(/['"\\]/g, '\\$&').replace(/\n/g, '');

    // Attempt to use Cover Art Archive if it's a track with an album MBID
    if (this.item?.entityType === 'tracks' && this.item.albumMbid) {
      return {
        url: `https://coverartarchive.org/release/${this.item.albumMbid}/front-250`,
        alt: `Cover Art for ${this.item.name}`,
        initials,
      };
    } else {
      return {
        initials,
      };
    }
  }
}
