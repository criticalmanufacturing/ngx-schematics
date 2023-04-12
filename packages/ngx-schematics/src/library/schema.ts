import { Schema as LibrarySchema } from '@schematics/angular/library/schema';

export interface Schema extends LibrarySchema {
  /**
   * Do not generate metadata files.
   */
  skipMetadata?: boolean;
}
