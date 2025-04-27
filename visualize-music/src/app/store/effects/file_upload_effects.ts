// src/app/store/effects/data.effects.ts
import { Injectable } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { from, of, Observable } from 'rxjs'; // Import from and Observable
import { map, catchError, switchMap, tap } from 'rxjs/operators';
import * as FileUploadActions from '../actions/file_upload.actions';
import * as DataActions from '../actions/data.actions'; // Import your data actions
import * as Papa from 'papaparse'; // Import PapaParse
import { RawDataEntry } from '../../common/interfaces/data.interfaces'; // Import your interface

@Injectable()
export class FileUploadEffects {
  constructor(private actions$: Actions) {}

  /**
   * Effect to handle parsing the CSV file when parseFileStart is dispatched.
   */
  parseFileStart$ = createEffect(() =>
    this.actions$.pipe(
      ofType(FileUploadActions.parseFileStart),
      switchMap((action) =>
        from(action.file.text()).pipe(
          switchMap((fileContent) => this.handleFile(fileContent)),
          map((rawData) => {
            console.log('[FileUploadEffects] CSV Parsed Successfully');
            return FileUploadActions.parseFileSuccess({ rawData });
          }),
          catchError((error) => {
            console.error('[FileUploadEffects] CSV Parsing Failed:', error);
            const errorMessage =
              error instanceof Error ? error.message : String(error);
            return of(
              FileUploadActions.parseFileFailure({ error: errorMessage })
            );
          })
        )
      )
    )
  );

  parseFileSuccess$ = createEffect(() =>
    this.actions$.pipe(
      ofType(FileUploadActions.parseFileSuccess),
      switchMap((unused) => {
        return of(DataActions.processDataStart());
      })
    )
  );

  private handleFile(file: any): Observable<RawDataEntry[]> {
    if (!file) {
      return of([]);
    }
    console.log('Starting file processing...');

    return new Observable((observer) =>
      Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        dynamicTyping: { uts: true }, // Attempt to parse 'uts' as number
        complete: (results: { data: RawDataEntry[]; errors: any[] }) => {
          console.log('CSV Parsing complete. Rows:', results?.data?.length);

          if (results.errors.length > 0) {
            console.error('CSV Parsing Errors:', results.errors);
            return observer.error(
              new Error(`Error parsing CSV: ${results.errors[0].message}`)
            );
          }
          if (!results.data || results.data.length === 0) {
            console.warn('CSV file is empty or could not be parsed correctly.');
            return observer.error(
              new Error('CSV file is empty or parsed incorrectly.')
            );
          }

          // // Validate required columns (optional, provide warning)
          if (!this.validateCsvColumns(results.data[0])) {
            return observer.error(
              new Error('CSV is missing required columns (uts, artist, track).')
            );
          }

          // processedData.rawData = results.data; // Store raw data for re-processing
          return observer.next(results.data);

          // Use setTimeout to allow UI update before potentially long processing
          setTimeout(() => {
            // try {
            //   console.log('Calling processListeningData...');
            //   processListeningData(processedData.rawData); // Initial processing
            //   console.log('processListeningData finished.');
            //   updateStatus(`Processed ${file.name}. Chart ready.`);
            //   uploadSection?.classList.add('hidden');
            //   chartSection?.classList.remove('hidden');
            //   currentWeekIndex = -1; // Start at latest week
            //   selectedHistoryEntity = { key: null, type: null };
            //   setDateInputRange(); // Set min/max for date picker
            //   updateChartOrList(); // Initial render
            //   updateSettingsUI(); // Ensure settings UI matches loaded state
            // } catch (error) {
            //   console.error('Error during post-parse processing:', error);
            //   updateStatus(
            //     `Error processing data: ${
            //       error.message || 'Unknown error'
            //     }. Check console.`,
            //     true
            //   );
            //   resetState(); // Reset on processing error
            // }
          }, 10); // Small delay
        },
        error: (error: any) => {
          console.error('PapaParse Error:', error);
          return observer.error(
            new Error(`Error parsing file: ${error.message || 'Unknown error'}`)
          );
        },
      })
    );
  }

  /** Checks for essential columns and warns if missing */
  private validateCsvColumns(firstRow: RawDataEntry) {
    const requiredColumns = ['uts', 'artist', 'track']; // Absolute minimum
    const recommendedColumns = ['artist_mbid', 'track_mbid', 'album_mbid']; // For better accuracy/art
    const actualColumns = Object.keys(firstRow || {});

    const missingRequired = requiredColumns.filter(
      (col) => !actualColumns.includes(col)
    );
    if (missingRequired.length > 0) {
      return false;
    }

    const missingRecommended = recommendedColumns.filter(
      (col) => !actualColumns.includes(col)
    );
    if (missingRecommended.length > 0) {
      console.warn(
        `Warning: Input CSV is missing recommended columns (${missingRecommended.join(
          ', '
        )}). Grouping/Art accuracy may be reduced.`
      );
    }

    return true;
  }

  // --- Other effects (processing data, etc.) would go here ---
}
