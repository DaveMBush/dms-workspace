import { computed } from "@angular/core";

import { selectTopEntities } from "./select-top-entities.function";

export const selectHolidays = computed(function selectHolidaysFunction() {
  const top = selectTopEntities();
  return top.entities['1']?.holidays ?? [];
})
