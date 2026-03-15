import { HarnessLoader } from '@angular/cdk/testing';
import { TestbedHarnessEnvironment } from '@angular/cdk/testing/testbed';
import { ComponentFixture } from '@angular/core/testing';

export function getHarnessLoader<T>(
  fixture: ComponentFixture<T>
): HarnessLoader {
  return TestbedHarnessEnvironment.loader(fixture);
}
