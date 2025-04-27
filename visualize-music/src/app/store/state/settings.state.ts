import { Settings } from '../../common/interfaces/settings.interface';
import {
  DEFAULT_WINDOW_WEEKS,
  DEFAULT_EXPORT_COUNT,
} from '../../common/utils/constants'; // Import default constants

export interface SettingsState {
  settings: Settings;
}

export const initialSettingsState: SettingsState = {
  settings: {
    windowDuration: DEFAULT_WINDOW_WEEKS,
    windowUnit: 'weeks',
    exportCount: DEFAULT_EXPORT_COUNT,
    isAllTimeMode: false,
  },
};
