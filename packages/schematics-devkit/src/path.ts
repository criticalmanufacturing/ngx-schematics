import { Path, relative as ngRelative } from '@angular-devkit/core';

/**
 * Builds the relative path from one path to another
 * @param from From Path
 * @param to To Path
 */
export function relative(from: Path, to: Path): string {
  let path: string = ngRelative(from, to);

  if (!path.startsWith('.')) {
    path = `./` + path;
  }

  return path;
}
