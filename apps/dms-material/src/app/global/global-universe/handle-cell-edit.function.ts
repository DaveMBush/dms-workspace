import { selectUniverses } from '../../store/universe/selectors/select-universes.function';
import { Universe } from '../../store/universe/universe.interface';
import { CellEditEvent } from './cell-edit-event.interface';
import { UniverseValidationService } from './services/universe-validation.service';

interface CellEditDeps {
  validationService: UniverseValidationService;
  emitCellEdit(event: CellEditEvent): void;
}

// When ex_date is set to a date in the past, also mark as expired.
// transformedValue is an ISO string (from transformExDateValue) or null.
function applyExDateExpiry(
  rowRecord: Record<string, unknown>,
  transformedValue: unknown
): void {
  if (transformedValue === null) {
    rowRecord['expired'] = false;
    return;
  }
  const parsedDate = new Date(transformedValue as string);
  rowRecord['expired'] =
    !isNaN(parsedDate.getTime()) && parsedDate < new Date();
}

export function handleCellEdit(
  row: Universe,
  field: keyof Universe,
  value: unknown,
  deps: CellEditDeps
): void {
  let transformedValue = value;
  if (field === 'ex_date') {
    transformedValue = deps.validationService.transformExDateValue(value);
  }

  if (!deps.validationService.validateFieldValue(field, transformedValue)) {
    return;
  }

  const universes = selectUniverses();
  for (let i = 0; i < universes.length; i++) {
    if (universes[i].id !== row.id) {
      continue;
    }
    const rowRecord = universes[i] as unknown as Record<string, unknown>;
    rowRecord[field] = transformedValue;
    if (field === 'ex_date') {
      applyExDateExpiry(rowRecord, transformedValue);
    }
    break;
  }

  deps.emitCellEdit({ row, field, value: transformedValue });
}
