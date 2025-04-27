import { createFeatureSelector, createSelector } from '@ngrx/store';
import { RawDataEntry } from '../../common/interfaces/data.interfaces';
import { FileUploadState } from '../state/file_upload.state'; // Adjust path if needed

export const selectFileUploadState =
  createFeatureSelector<FileUploadState>('fileUpload');

export const selectRawData = createSelector(
  selectFileUploadState,
  (state: FileUploadState): RawDataEntry[] => state.rawData
);
