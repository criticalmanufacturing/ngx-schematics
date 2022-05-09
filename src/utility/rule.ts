import { dirname, extname, join, normalize } from '@angular-devkit/core';
import { ProjectDefinition } from '@angular-devkit/core/src/workspace';
import { Rule, Tree } from '@angular-devkit/schematics';
import ts = require('@schematics/angular/third_party/github.com/Microsoft/TypeScript/lib/typescript');
import { applyToUpdateRecorder } from '@schematics/angular/utility/change';
import { JSONFile } from '@schematics/angular/utility/json-file';

import { insertExport } from './ast';
import { findMetadataFile, insertMetadata, MetadataProperty } from './metadata';
import { buildRelativePath } from './string';

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

export interface UpdateMetadataOptions {
  imports: Record<string, string>;
  identifier: MetadataProperty;
  toInsert: string;
}

export function updateMetadata(project: ProjectDefinition, options: UpdateMetadataOptions): Rule {
  return async (tree: Tree) => {
    if (!tree.exists(join(normalize(project.root), 'metadata', 'ng-package.json'))) {
      return;
    }

    const json = new JSONFile(tree, join(normalize(project.root), 'metadata', 'ng-package.json'));
    const entryFile = json.get(['lib', 'entryFile']) as string | null;

    if (!entryFile) {
      return;
    }

    const content = tree.get(join(normalize(project.root), 'metadata', entryFile))?.content.toString('utf-8');

    if (!content) {
      return;
    }

    const metadataPath = findMetadataFile(content, entryFile, project.root);

    if (!metadataPath) {
      return;
    }

    const metadataContent = tree.get(metadataPath)?.content.toString('utf-8');

    if (!metadataContent) {
      return;
    }

    const recorder = tree.beginUpdate(metadataPath);
    applyToUpdateRecorder(recorder, insertMetadata(
      metadataContent,
      metadataPath,
      options.imports,
      options.identifier,
      options.toInsert
    ));
    tree.commitUpdate(recorder);
  };
}
