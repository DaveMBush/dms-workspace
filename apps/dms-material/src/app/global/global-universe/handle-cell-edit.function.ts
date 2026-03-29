import { selectUniverses } from '../../store/universe/selectors/select-universes.function';
import { Universe } from '../../store/universe/universe.interface';
import { CellEditEvent } from './cell-edit-event.interface';
import { UniverseValidationService } from './services/universe-validation.service';

interface CellEditDeps {
  validationService: UniverseValidationService;
  emitCellEdit(event: CellEditEvent): void;
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
    if (universes[i].id === row.id) {
      (universes[i] as unknown as Record<string, unknown>)[field] =
        transformedValue;
      break;
    }
  }

  deps.emitCellEdit({ row, field, value: transformedValue });
}
