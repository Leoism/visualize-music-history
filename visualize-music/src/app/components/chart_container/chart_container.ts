import { ChangeDetectionStrategy, Component, Input } from '@angular/core';

import { CommonModule } from '@angular/common';
import { ChartItem } from '../../common/interfaces/data.interfaces';
import { ChartRowComponent } from './chart_row/chart_row';

@Component({
  selector: 'app-chart-container',
  templateUrl: './chart_container.ng.html',
  styleUrls: ['./chart_container.scss'],
  imports: [CommonModule, ChartRowComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: true,
})
export class ChartContainerComponent {
  @Input() items?: ChartItem[] = [];
  @Input() week?: string;
  constructor() {}
}
