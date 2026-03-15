import { HarnessLoader } from '@angular/cdk/testing';
import { MatInputHarness } from '@angular/material/input/testing';

export async function typeInInput(
  loader: HarnessLoader,
  placeholder: string,
  value: string
): Promise<void> {
  const input = await loader.getHarness(MatInputHarness.with({ placeholder }));
  await input.setValue(value);
}
