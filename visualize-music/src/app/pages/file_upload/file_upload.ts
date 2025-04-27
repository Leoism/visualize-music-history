import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { FileUploadComponent } from '../../components/file_upload/file_upload';

@Component({
  selector: 'app-file-upload-page',
  imports: [RouterOutlet, FileUploadComponent],
  templateUrl: './file_upload.ng.html',
})
export class FileUploadPage {
  title = 'visualize-music';
}
