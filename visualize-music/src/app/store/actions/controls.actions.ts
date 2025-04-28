import { createAction, props } from '@ngrx/store';

export const nextWeekRequest = createAction('[Controls] Next Week Request');

export const prevWeekRequest = createAction('[Controls] Prev Week Request');

export const jumpToWeekRequest = createAction(
  '[Controls] Jump To Week Request',
  props<{ date: Date }>()
);

export const updateCurrentWeekIndex = createAction(
  '[Controls] Update Current Week Index',
  props<{ weekIndex: number }>()
);

export const syncWeekFromUrl = createAction(
  '[Controls] Sync Week From URL',
  props<{ weekIdString: string }>() // YYYY-MM-DD format
);
