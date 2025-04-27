export interface ExportState {
  /** Flag indicating if the HTML preview for the export is currently being generated */
  isGeneratingPreview: boolean;

  /** Flag indicating if the final PNG image is currently being generated via html2canvas */
  isGeneratingImage: boolean;

  /** The generated HTML content string to be displayed in the preview modal */
  exportPreviewHtml: string | null;

  /** The proposed filename for the exported image */
  exportFilename: string | null;

  /** Stores any error message related to the export process */
  exportError: string | null;
}

export const initialExportState: ExportState = {
  isGeneratingPreview: false,
  isGeneratingImage: false,
  exportPreviewHtml: null,
  exportFilename: null,
  exportError: null,
};
