import { HarnessLoader } from '@angular/cdk/testing';
import { MatSelectHarness } from '@angular/material/select/testing';

export async function selectOption(
  loader: HarnessLoader,
  label: string,
  value: string
): Promise<void> {
  const select = await loader.getHarness(
    MatSelectHarness.with({ selector: `[aria-label="${label}"]` })
  );
  await select.open();
  await select.clickOptions({ text: value });
}
