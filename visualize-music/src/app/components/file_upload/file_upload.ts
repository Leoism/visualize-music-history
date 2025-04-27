import { Component, ChangeDetectionStrategy } from '@angular/core';
import { Store } from '@ngrx/store';
import { Observable } from 'rxjs';

import { AppState } from '../../store/state/app.state';
import * as DataActions from '../../store/actions/data.actions';
import * as UiSelectors from '../../store/selectors/ui.selectors';
import * as DataSelectors from '../../store/selectors/data.selectors';

@Component({
  selector: 'app-file-upload',
  templateUrl: './file-upload.component.html',
  styleUrls: ['./file-upload.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FileUploadComponent {
  statusMessage$: Observable<string | null> = this.store.select(
    UiSelectors.selectStatusMessage
  );
  isErrorStatus$: Observable<boolean> = this.store.select(
    UiSelectors.selectIsErrorStatus
  );
  isProcessing$: Observable<boolean> = this.store.select(
    DataSelectors.selectIsProcessing
  );

  isDragOver = false;

  constructor(private store: Store<AppState>) {}

  /** Handles file selection via the input element */
  onFileSelected(event: Event): void {
    const element = event.currentTarget as HTMLInputElement;
    const fileList: FileList | null = element.files;

    if (fileList && fileList.length > 0) {
      const file = fileList[0];
      this.processFile(file);
    }

    element.value = '';
  }

  /** Handles file drop event */
  handleDrop(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragOver = false;

    if (event.dataTransfer?.files && event.dataTransfer.files.length > 0) {
      const file = event.dataTransfer.files[0];
      this.processFile(file);
      event.dataTransfer.clearData();
    }
  }

  /** Handles drag over event */
  handleDragOver(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragOver = true;
  }

  /** Handles drag leave event */
  handleDragLeave(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragOver = false;
  }

  // --- Helper Methods ---

  /** Validates file type and dispatches the starting action */
  private processFile(file: File): void {
    if (file && file.type === 'text/csv') {
      console.log(`File selected/dropped: ${file.name}`);
      this.store.dispatch(DataActions.parseFileStart({ file }));
    } else {
      this.store.dispatch(
        DataActions.parseFileFailure({
          error: 'Invalid file type. Please upload a CSV file.',
        })
      );
      console.error('Invalid file type selected.');
    }
  }
}
