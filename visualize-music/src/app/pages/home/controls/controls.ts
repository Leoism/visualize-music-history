import { ChangeDetectionStrategy, Component, Input } from '@angular/core';

import { CommonModule } from '@angular/common';
import { ChartItem } from '../../common/interfaces/data.interfaces';
import { ChartRowComponent } from './chart_row/chart_row';

@Component({
  selector: 'app-chart-controls',
  templateUrl: './controls.ng.html',
  styleUrls: ['./controls.scss'],
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: true,
})
export class ChartContainerComponent {
  constructor() {}
}
