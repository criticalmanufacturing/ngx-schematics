import { dirname, extname, join, normalize } from '@angular-devkit/core';
import { Rule, Tree } from '@angular-devkit/schematics';
import { ProjectDefinition } from '@schematics/angular/utility';

import {
  createSourceFile,
  insertExport,
  ProjectType,
  JSONFile,
  relative
} from '@criticalmanufacturing/schematics-devkit';

/**
 * Updates the project public api by adding all the created *.ts files to it.
 * @param project project definition from which the public api will be updated
 */
export function updateLibraryAPI(project: ProjectDefinition): Rule {
  return async (tree: Tree) => {
    if (
      project.extensions['projectType'] !== ProjectType.Library ||
      !tree.exists(join(normalize(project.root), 'ng-package.json'))
    ) {
      return;
    }

    const json = new JSONFile(tree, join(normalize(project.root), 'ng-package.json'));
    const entryFile = json.get(['lib', 'entryFile']) as string | null;

    if (!entryFile) {
      return;
    }

    const entryDir = join(tree.root.path, dirname(join(normalize(project.root), entryFile)));
    const filesToExport = tree.actions
      .filter((action) => action.kind === 'c' && extname(action.path) === '.ts')
      .map((action) => ({
        relativePath: relative(entryDir, action.path),
        path: action.path
      }));

    const source = createSourceFile(tree, join(normalize(project.root), entryFile));

    if (!source) {
      return;
    }

    filesToExport.forEach((file) => {
      insertExport(source, '', file.relativePath.replace(extname(file.path), ''), true);
    });

    tree.overwrite(join(normalize(project.root), entryFile), source.getFullText());
  };
}
