import { AsyncPipe, CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  EventEmitter,
  inject,
  Input,
  ViewChild,
} from '@angular/core';
import { Store } from '@ngrx/store';
import * as htmlToImage from 'html-to-image';
import { ButtonModule } from 'primeng/button';
import { Dialog } from 'primeng/dialog';
import { TableModule } from 'primeng/table';
import {
  ChartItem,
  RankStatus,
} from '../../../../common/interfaces/data.interfaces';
import {
  EXPORT_MAX_PLAY_CHANGE_FACTOR,
  EXPORT_ROW_BG_BASE,
  EXPORT_ROW_BG_NEGATIVE,
  EXPORT_ROW_BG_POSITIVE,
} from '../../../../common/utils/constants';
import { selectSelectedEntityType } from '../../../../store/selectors/ui.selectors';
import { formatDateKey } from '../../../../common/utils/date_utils';
import { combineLatestWith, map, Subject } from 'rxjs';
import {
  selectWindowDuration,
  selectWindowUnit,
} from '../../../../store/selectors/settings.selectors';
import { RankingWindowUnit } from '../../../../common/interfaces/settings.interface';
import { subDays } from 'date-fns';
import { calculateDaysFromUnitDuration } from '../../../../common/utils/utils';

interface EnrinchedChartItem extends ChartItem {
  hasHighestWoc: boolean;
}

@Component({
  selector: 'app-export-chart',
  templateUrl: './export_chart.ng.html',
  styleUrls: ['./export_chart.scss'],
  standalone: true,
  imports: [Dialog, ButtonModule, TableModule, AsyncPipe, CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ExportChartComponent {
  @ViewChild('exportContainer') exportContainer!: any;
  @Input() exportCount: number = 0;
  private _currentWeekDate: Date = new Date(0);
  @Input()
  set currentWeekDate(date: string) {
    this._currentWeekDate = new Date(date);
  }
  get currentWeekDate(): Date {
    return this._currentWeekDate;
  }
  private _currentWeekData: EnrinchedChartItem[] = [];
  @Input()
  set currentWeekData(data: ChartItem[]) {
    const choppedItems = data.slice(0, Math.min(this.exportCount, data.length));

    let highestIdx = -1;
    let highestWoc = 0;
    for (let i = 0; i < choppedItems.length; i++) {
      if (choppedItems[i].weeksOnChart > highestWoc) {
        highestIdx = i;
        highestWoc = choppedItems[i].weeksOnChart;
      }
    }
    this._currentWeekData = choppedItems.map((item, index) => {
      return {
        ...item,
        hasHighestWoc: index == highestIdx,
      };
    });
  }
  get currentWeekData() {
    return this._currentWeekData;
  }
  visible: boolean = false;

  private readonly store = inject(Store);
  private erroredAlbums: Set<string> = new Set();

  isExporting$ = new Subject<boolean>();
  currentEntityType$ = this.store.select(selectSelectedEntityType);
  trackingStartDate$ = this.store.select(selectWindowDuration).pipe(
    combineLatestWith(this.store.select(selectWindowUnit)),
    map(
      ([windowSize, windowUnit]: [number, RankingWindowUnit]):
        | Date
        | 'all-time' => {
        let sizeInDays = calculateDaysFromUnitDuration(windowUnit, windowSize);

        if (sizeInDays === null) {
          return 'all-time';
        }

        return subDays(this._currentWeekDate, sizeInDays);
      }
    )
  );

  newColor = '#ffe97f';
  reEntryColor = '#a855f7';
  postiveDeltaColor = '#10b981';
  negativeDeltaColor = '#ef4444';
  equalColor = '#6b7280';

  showDialog() {
    this.visible = true;
  }

  getExportLabel() {
    return `Export Top ${this.exportCount}`;
  }

  getLastWeekDiff(rankStatus: RankStatus): string {
    if (rankStatus === 'NEW') {
      return 'NEW';
    } else if (rankStatus === 'RE-ENTRY') {
      return 'RE';
    } else if (typeof rankStatus === 'number') {
      if (rankStatus > 0) {
        return `+${rankStatus}`;
      } else if (rankStatus < 0) {
        return `${rankStatus}`; // Already negative
      } else {
        // rankStatus === 0
        return '=';
      }
    }

    throw new Error(`Invalid rankStatus: ${rankStatus}`);
  }

  getLastWeekStyle(rankStatus: RankStatus): object {
    if (rankStatus === 'NEW') {
      return { color: this.newColor, 'font-weight': 'bold' };
    } else if (rankStatus === 'RE-ENTRY') {
      return { color: this.reEntryColor, 'font-weight': 'bold' };
    } else if (typeof rankStatus === 'number') {
      if (rankStatus > 0) {
        return { color: this.postiveDeltaColor };
      } else if (rankStatus < 0) {
        return { color: this.negativeDeltaColor };
      } else {
        // rankStatus === 0
        return { color: this.equalColor };
      }
    }

    throw new Error(`Invalid rankStatus: ${rankStatus}`);
  }

  getLastWeekDiffBackgroundColor(rankStatus: RankStatus): object {
    if (rankStatus === 'NEW') {
      return { 'background-color': '#fffbe5' };
    } else if (rankStatus === 'RE-ENTRY') {
      return { 'background-color': '#f2e5fe' };
    } else if (typeof rankStatus === 'number') {
      if (rankStatus > 0) {
        return {
          'background-color': '#e4fff6',
        };
      } else if (rankStatus < 0) {
        return { 'background-color': '#ffe6e6' };
      } else {
        // rankStatus === 0
        return {};
      }
    }

    throw new Error(`Invalid rankStatus: ${rankStatus}`);
  }

  getExportRowBackgroundColor(playPercentChange: number): object {
    const absChange = Math.abs(playPercentChange);
    // Scale factor based on % change, capped at MAX_PLAY_CHANGE_FACTOR (e.g., 1.0 for 100% change)
    const factor = Math.min(absChange / 100, EXPORT_MAX_PLAY_CHANGE_FACTOR);

    if (playPercentChange > 0) {
      return {
        'background-color': this.interpolateColor(
          EXPORT_ROW_BG_BASE,
          EXPORT_ROW_BG_POSITIVE,
          factor
        ),
      };
    } else if (playPercentChange < 0) {
      // playPercentChange < 0
      return {
        'background-color': this.interpolateColor(
          EXPORT_ROW_BG_BASE,
          EXPORT_ROW_BG_NEGATIVE,
          factor
        ),
      };
    } else {
      return {};
    }
  }

  interpolateColor(color1: string, color2: string, factor: number): string {
    factor = Math.max(0, Math.min(1, factor + 0.1));
    const rgb1 = this.hexToRgb(color1);
    const rgb2 = this.hexToRgb(color2);
    if (!rgb1 || !rgb2) return color1; // Fallback to color1 if parsing fails
    const r = Math.round(rgb1.r + factor * (rgb2.r - rgb1.r));
    const g = Math.round(rgb1.g + factor * (rgb2.g - rgb1.g));
    const b = Math.round(rgb1.b + factor * (rgb2.b - rgb1.b));
    return this.rgbToHex(r, g, b);
  }

  rgbToHex(r: number, g: number, b: number): string {
    return (
      '#' +
      ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1).toUpperCase()
    );
  }

  hexToRgb(hex: string) {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result
      ? {
          r: parseInt(result[1], 16),
          g: parseInt(result[2], 16),
          b: parseInt(result[3], 16),
        }
      : null;
  }

  getImageProperties(item: ChartItem): {
    url?: string;
    alt?: string;
    error: (event: Event) => void;
    initials: string;
  } {
    let initials = '?';
    if (item.name && item.name !== '-') {
      initials = item.name.charAt(0).toUpperCase();
      if (item.entityType === 'tracks' && item.artistName) {
        initials += item.artistName.charAt(0).toUpperCase();
      } else if (item.entityType === 'artists' && item.name.length > 1) {
        initials = item.name.substring(0, 2).toUpperCase();
      }
    }
    // Attempt to use Cover Art Archive if it's a track with an album MBID
    if (
      item.entityType === 'tracks' &&
      item.albumMbid &&
      !this.erroredAlbums.has(item.albumMbid)
    ) {
      return {
        url: `https://coverartarchive.org/release/${item.albumMbid}/front-250`,
        alt: `Cover Art for ${item.name}`,
        initials,
        error: (event: Event) => {
          const img = event.target as HTMLImageElement;
          img.src = `https://placehold.co/48x50/4b5563/ffffff?text=${initials}`;
        },
      };
    } else {
      return {
        url: `https://placehold.co/48x48/4b5563/ffffff?text=${initials}`,
        alt: `Placeholder image for ${item.name}`,
        initials,
        error: (unused) => {},
      };
    }
  }

  exportImage() {
    const self = this;
    self.isExporting$.next(true);
    var link = document.createElement('a');
    link.download = `top-${this.exportCount}-week-of-${formatDateKey(self.currentWeekDate)}.png`;
    htmlToImage
      .toPng(self.exportContainer.nativeElement)
      .then((dataUrl) => {
        link.href = dataUrl;
        link.click();
        self.isExporting$.next(false);
        link.remove();
      })
      .catch((e) => {
        self.isExporting$.next(false);
      });
  }
}
