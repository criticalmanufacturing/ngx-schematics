import { dirname, extname, join, normalize } from '@angular-devkit/core';
import { Rule, Tree } from '@angular-devkit/schematics';
import { ProjectDefinition } from '@schematics/angular/utility';

import {
  createSourceFile,
  insertExport,
  ProjectType,
  getEntryFilePath,
  relative
} from '@criticalmanufacturing/schematics-devkit';

/**
 * Re-exports TypeScript files created by the schematic from the library's primary entry point.
 * @param project Library project whose public API is updated.
 */
export function updateLibraryAPI(project: ProjectDefinition): Rule {
  return (tree: Tree) => {
    if (project.extensions['projectType'] !== ProjectType.Library) {
      return;
    }

    const entryFile = getEntryFilePath(tree, project, '');
    if (!entryFile) {
      return;
    }

    const entryDir = join(tree.root.path, dirname(normalize(entryFile)));
    const filesToExport = tree.actions
      .filter((action) => action.kind === 'c' && extname(action.path) === '.ts')
      .map((action) => ({
        relativePath: relative(entryDir, action.path),
        path: action.path
      }));

    const source = createSourceFile(tree, entryFile);

    if (!source) {
      return;
    }

    filesToExport.forEach((file) => {
      insertExport(source, '', file.relativePath.replace(extname(file.path), ''), true);
    });

    tree.overwrite(entryFile, source.getFullText());
  };
}
