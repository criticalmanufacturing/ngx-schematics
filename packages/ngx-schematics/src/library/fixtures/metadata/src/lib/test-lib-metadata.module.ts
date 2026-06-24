import { EnvironmentProviders } from '@angular/core';
import { provideMetadata } from 'cmf-core';

import { TestLibMetadataService } from './test-lib-metadata.service';

/** Provides Test Lib functionality */
export function provideTestLib(): EnvironmentProviders {
  return provideMetadata(TestLibMetadataService);
}
