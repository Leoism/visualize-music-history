import { Component, Input } from '@angular/core';
import { RouterOutlet } from '@angular/router';

@Component({
  selector: 'app-home-page',
  imports: [],
  templateUrl: './home.ng.html',
})
export class HomePage {
  @Input() weekId?: string;
}
