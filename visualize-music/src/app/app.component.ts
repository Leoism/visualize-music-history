import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { FileUploadPage } from './pages/file_upload/file_upload';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, FileUploadPage],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss',
})
export class AppComponent {
  title = 'visualize-music';
}
