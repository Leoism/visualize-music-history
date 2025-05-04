import { Component, Input } from '@angular/core';
import { EntityKey, EntityType } from '../../common/interfaces/data.interfaces';

@Component({
  selector: 'app-home-page',
  imports: [],
  templateUrl: './details.ng.html',
})
export class DetailsPage {
  @Input() id: EntityKey = '';
  @Input() entityType?: EntityType;
}
