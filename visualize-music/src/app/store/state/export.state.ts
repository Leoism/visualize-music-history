export interface ExportState {
  /** Flag indicating if the HTML preview for the export is currently being generated */
  isGeneratingPreview: boolean;

  /** Flag indicating if the final PNG image is currently being generated via html2canvas */
  isGeneratingImage: boolean;

  /** The generated HTML content string to be displayed in the preview modal */
  exportPreviewHtml?: string;

  /** The proposed filename for the exported image */
  exportFilename?: string;

  /** Stores any error message related to the export process */
  exportError?: string;
}

export const initialExportState: ExportState = {
  isGeneratingPreview: false,
  isGeneratingImage: false,
};
