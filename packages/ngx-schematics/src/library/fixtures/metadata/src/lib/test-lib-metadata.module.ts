import { EnvironmentProviders, NgModule } from '@angular/core';
import { provideMetadata } from 'cmf-core';

import { TestLibMetadataService } from './test-lib-metadata.service';

@NgModule({
  providers: [provideTestLib()]
})
export class TestLibMetadataModule { }

/** Provides Test Lib functionality */
export function provideTestLib(): EnvironmentProviders {
  return provideMetadata(TestLibMetadataService);
}
