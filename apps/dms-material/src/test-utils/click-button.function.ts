import { HarnessLoader } from '@angular/cdk/testing';
import { MatButtonHarness } from '@angular/material/button/testing';

export async function clickButton(
  loader: HarnessLoader,
  text: string
): Promise<void> {
  const button = await loader.getHarness(MatButtonHarness.with({ text }));
  await button.click();
}
