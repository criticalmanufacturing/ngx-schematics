import { Schema as LibrarySchema } from '@schematics/angular/library/schema';

export interface Schema extends Omit<LibrarySchema, 'entryFile'> {
  /**
   * The package namespace to use.
   */
  namespace?: string;
}
