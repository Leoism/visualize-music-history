import {
  ChangeDetectionStrategy,
  Component,
  inject,
  Input,
} from '@angular/core';
import { Dialog } from 'primeng/dialog';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import {
  ChartItem,
  RankStatus,
} from '../../../../common/interfaces/data.interfaces';
import { ChartContainerComponent } from '../../../../components/chart_container/chart_container';
import { TableModule } from 'primeng/table';
import { Store } from '@ngrx/store';
import { selectListDataForCurrentWeek } from '../../../../store/selectors/data.selectors';
import { AsyncPipe, CommonModule } from '@angular/common';
import { selectSelectedEntityType } from '../../../../store/selectors/ui.selectors';
import {
  EXPORT_MAX_PLAY_CHANGE_FACTOR,
  EXPORT_ROW_BG_BASE,
  EXPORT_ROW_BG_NEGATIVE,
  EXPORT_ROW_BG_POSITIVE,
} from '../../../../common/utils/constants';

@Component({
  selector: 'app-export-chart',
  templateUrl: './export_chart.ng.html',
  styleUrls: ['./export_chart.scss'],
  standalone: true,
  imports: [Dialog, ButtonModule, TableModule, AsyncPipe, CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ExportChartComponent {
  @Input() exportCount: number = 0;
  visible: boolean = false;

  private readonly store = inject(Store);

  currentWeekChartItems$ = this.store.select(selectListDataForCurrentWeek);
  currentEntityType$ = this.store.select(selectSelectedEntityType);

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
}
