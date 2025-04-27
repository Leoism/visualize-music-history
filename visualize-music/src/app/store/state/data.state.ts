import {
  ProcessedData,
  RawDataEntry,
} from '../../common/interfaces/data.interfaces'; // Adjust path

export interface DataState {
  /** The raw data directly parsed from the CSV file */
  rawData: RawDataEntry[] | null;

  /** The structured data after aggregation, ranking, and history calculation */
  processedData: ProcessedData | null;

  /** Flag indicating if parsing or processing is currently in progress */
  isProcessing: boolean;

  /** Stores any error message related to data parsing or processing */
  processingError: string | null;
}

export const initialDataState: DataState = {
  rawData: null,
  processedData: null,
  isProcessing: false,
  processingError: null,
};
