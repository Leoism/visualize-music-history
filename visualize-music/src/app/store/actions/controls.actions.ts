import { createAction, props } from '@ngrx/store';
import { EntityType } from '../../common/interfaces/data.interfaces';

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

export const syncEntityTypeFromUrl = createAction(
  '[Controls] Sync Entity Type From URL',
  props<{ entityType: EntityType }>() // EntityType enum value
);
