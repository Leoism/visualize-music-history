// src/app/store/state/app.state.ts

import { DataState, initialDataState } from './data.state';
import { UiState, initialUiState } from './ui.state'; // Assuming ui.state.ts exists
import { SettingsState, initialSettingsState } from './settings.state'; // Assuming settings.state.ts exists
import { ExportState, initialExportState } from './export.state'; // Assuming export.state.ts exists
import { FileUploadState, initialFileUploadState } from './file_upload.state'; // Assuming file_upload.state.ts exists

export interface AppState {
  data: DataState;
  ui: UiState;
  settings: SettingsState;
  export: ExportState;
  fileUpload: FileUploadState;
}

// Delete the template below and add your own state
export const initialAppState: AppState = {
  data: initialDataState,
  ui: initialUiState,
  settings: initialSettingsState,
  export: initialExportState,
  fileUpload: initialFileUploadState,
};
