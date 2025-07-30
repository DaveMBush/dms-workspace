import { computed } from '@angular/core';
import { createSmartSignal } from '@smarttools/smart-signals';

import { Top } from './top.interface';
export const selectTopEntities = createSmartSignal<Top>('app', 'top');

export const selectHolidays = computed(() => {
  const top = selectTopEntities();
  return top.entities['1']?.holidays!;
})
