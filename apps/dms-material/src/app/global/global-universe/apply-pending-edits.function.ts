import { Universe } from '../../store/universe/universe.interface';

export function applyPendingEdits(
  data: Universe[],
  edits: Map<string, Record<string, unknown>>
): void {
  if (edits.size === 0) {
    return;
  }
  for (let i = 0; i < data.length; i++) {
    const override = edits.get(data[i].id);
    if (override === undefined) {
      continue;
    }
    Object.assign(data[i], override);
  }
}
