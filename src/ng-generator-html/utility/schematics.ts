import { dirname, extname, join, normalize } from '@angular-devkit/core';
import { ProjectDefinition } from '@angular-devkit/core/src/workspace';
import { Rule, Tree } from '@angular-devkit/schematics';
import { applyToUpdateRecorder } from '@schematics/angular/utility/change';
import { JSONFile } from '@schematics/angular/utility/json-file';
import * as ts from 'typescript';

import { insertExport } from './ast-uil';
import { buildRelativePath } from './string-util';

export function updatePublicAPI(project: ProjectDefinition, description?: string): Rule {
  return async (tree: Tree) => {
    if (tree.exists(join(normalize(project.root), 'ng-package.json'))) {
      const json = new JSONFile(tree, join(normalize(project.root), 'ng-package.json'));
      const entryFile = json.get(['lib', 'entryFile']) as string | null;

      if (entryFile) {
        const entryDir = join(tree.root.path, dirname(join(normalize(project.root), entryFile)));
        const filesToExport = tree.actions
          .filter(action => action.kind === 'c' && extname(action.path) === '.ts')
          .map((action) => ({ relativePath: buildRelativePath(entryDir, action.path), path: action.path }));

        const content = tree.get(join(normalize(project.root), entryFile))!.content.toString('utf-8');
        const source = ts.createSourceFile(join(normalize(project.root), entryFile), content, ts.ScriptTarget.Latest, true);

        const recorder = tree.beginUpdate(join(normalize(project.root), entryFile));
        const changes = filesToExport.map((file, index) =>
          insertExport(source, file.path, '*', file.relativePath.replace(extname(file.path), ''), index === 0 ? description : undefined, true));
        applyToUpdateRecorder(recorder, changes);
        tree.commitUpdate(recorder);
      }
    }
  }
}