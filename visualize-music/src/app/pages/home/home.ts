import { Component, Input } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { ChartRowComponent } from '../../components/chart_container/chart_row/chart_row';
import { ChartItem } from '../../common/interfaces/data.interfaces';

@Component({
  selector: 'app-home-page',
  imports: [ChartRowComponent],
  templateUrl: './home.ng.html',
})
export class HomePage {
  @Input() weekId?: string;

  chartItem: ChartItem = {
    key: 'track-key',
    entityType: 'track',
    name: 'Track Name',
    artistName: 'Artist Name',
    albumMbid: 'album-mbid',
    rank: 1,
    plays: 100,
    rankStatus: 'NEW',
    peak: 1,
    peakStatus: 'PEAK',
    weeksOnChart: 5,
    playPercentChange: 10,
    lastWeekRank: 2,
  };
}
