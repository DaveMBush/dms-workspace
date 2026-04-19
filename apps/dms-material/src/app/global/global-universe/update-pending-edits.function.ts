import { WritableSignal } from '@angular/core';

import { Universe } from '../../store/universe/universe.interface';

export function updatePendingEdits(
  pendingEdits$: WritableSignal<Map<string, Record<string, unknown>>>,
  rowId: string,
  field: keyof Universe,
  transformed: unknown
): void {
  const newEdits = new Map(pendingEdits$());
  const existing = newEdits.get(rowId) ?? {};
  existing[field as string] = transformed;
  if (field === 'ex_date') {
    const parsedDate =
      transformed !== null ? new Date(transformed as string) : null;
    existing['expired'] =
      parsedDate !== null &&
      !isNaN(parsedDate.getTime()) &&
      parsedDate < new Date();
  }
  newEdits.set(rowId, existing);
  pendingEdits$.set(newEdits);
}
