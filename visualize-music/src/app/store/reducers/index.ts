import { ActionReducerMap } from '@ngrx/store';
import { AppState } from '../state/app.state'; // Import your root state interface
import { dataReducer } from './data.reducer'; // Import individual reducers
import { uiReducer } from './ui.reducer';
import { settingsReducer } from './settings.reducer';
import { exportReducer } from './export.reducer';
import { fileUploadReducer } from './file_upload.reducer';

// This object maps the state slice keys to their reducer functions
export const appReducers: ActionReducerMap<AppState> = {
  data: dataReducer,

  ui: uiReducer,

  settings: settingsReducer,

  export: exportReducer,

  fileUpload: fileUploadReducer,
};
