import { Path, normalize, relative as ngRelative, isAbsolute } from '@angular-devkit/core';

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

/**
 * Gets the relative path from the given path to the root
 * @param projectRoot
 * @returns
 */
export function relativeToRoot(path: string): string {
  if (!isAbsolute(normalize(path))) {
    path = '/' + path;
  }

  return relative(normalize(path), normalize('/'));
}
