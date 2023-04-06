import { Schema as LibrarySchema } from '@schematics/angular/library/schema';

export type Schema = Omit<LibrarySchema, 'entryFile'>;
