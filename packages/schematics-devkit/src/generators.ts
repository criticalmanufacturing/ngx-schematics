import { basename, dirname, join, normalize } from '@angular-devkit/core';

/**
 * Name Location
 */
export interface NameLocation {
  name: string;
  path: string;
}

/**
 * Extracts the name from the provided path in the schematics options
 */
export function parseName(path: string, name: string): NameLocation {
  const nameWithoutPath = basename(normalize(name));
  const namePath = dirname(join(normalize(path), name));

  return {
    name: nameWithoutPath,
    path: normalize('/' + namePath)
  };
}
