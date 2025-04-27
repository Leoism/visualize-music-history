import { RawDataEntry } from '../../common/interfaces/data.interfaces'; // Adjust path

export interface FileUploadState {
  /** The raw data directly parsed from the CSV file */
  rawData: RawDataEntry[];

  isProcessing: boolean;

  /** Stores any error message related to data parsing or processing */
  processingError: string | null;
}

export const initialFileUploadState: FileUploadState = {
  rawData: [],
  isProcessing: false,
  processingError: null,
};
