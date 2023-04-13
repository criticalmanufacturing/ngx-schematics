import { dirname, join, normalize } from '@angular-devkit/core';
import { Tree } from '@angular-devkit/schematics';
import { ProjectDefinition } from '@schematics/angular/utility';
import { createSourceFile } from '../ast/generic';
import { JSONFile } from '../parsers/json';

/**
 * Finds the file path in the public api given the entry point name
 * @param content File content to search the metadata on
 * @param fileName Metadata File Name
 */
export function getEntryFilePath(
  tree: Tree,
  project: ProjectDefinition,
  entryPoint: string
): string | undefined {
  if (!tree.exists(join(normalize(project.root), entryPoint, 'ng-package.json'))) {
    return;
  }

  const json = new JSONFile(tree, join(normalize(project.root), entryPoint, 'ng-package.json'));
  const entryFile = json.get(['lib', 'entryFile']) as string | undefined;

  if (!entryFile) {
    return;
  }

  return join(normalize(project.root), entryPoint, entryFile);
}

/**
 * Finds the file path in the public api given the entry point name
 * @param content File content to search the metadata on
 * @param fileName Metadata File Name
 */
export function getFilePathFromEntryPoint(
  tree: Tree,
  project: ProjectDefinition,
  entryPoint: string,
  filterFn: (module: string) => boolean
): string | undefined {
  const entryFilePath = getEntryFilePath(tree, project, entryPoint);

  if (!entryFilePath) {
    return;
  }

  const source = createSourceFile(tree, entryFilePath);

  if (!source) {
    return;
  }

  const exportNodes = source.getExportDeclarations();

  for (const node of exportNodes) {
    const module = node.getModuleSpecifierValue();

    if (module && filterFn(module)) {
      return join(dirname(normalize(entryFilePath)), module) + '.ts';
    }
  }

  return;
}
