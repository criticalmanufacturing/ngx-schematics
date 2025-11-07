import { join, normalize } from '@angular-devkit/core';
import { Rule, Tree } from '@angular-devkit/schematics';

/**
 * Recursively removes all files and subdirectories within the specified directory.
 * @param tree The Tree object representing the file system.
 * @param sourcePath The path of the directory to remove files from.
 */
function removeAllFiles(tree: Tree, sourcePath: string): void {
  const dir = tree.getDir(sourcePath);

  // Remove all files in the current directory
  dir.subfiles.forEach((path) => {
    tree.delete(join(normalize(sourcePath), path));
  });

  // Recursively remove files in subdirectories
  dir.subdirs.forEach((path) => {
    removeAllFiles(tree, join(normalize(sourcePath), path));
  });
}

/**
 * Removes the specified directory
 * @param sourcePath the directory path to remove
 */
export function removeDirectory(sourcePath: string): Rule {
  return (tree: Tree) => {
    removeAllFiles(tree, sourcePath);
  };
}

/**
 * Removes a single file from the file system.
 * @param sourcePath The path of the file to be removed.
 */
export function removeFile(sourcePath: string): Rule {
  return (tree: Tree) => {
    tree.delete(sourcePath);
  };
}
