import { dirname, join, normalize } from '@angular-devkit/core';
import { Tree } from '@angular-devkit/schematics';
import { AngularBuilder, ProjectDefinition } from '@schematics/angular/utility';
import { createSourceFile } from '../ast/generic.js';
import { JSONFile } from '../parsers/json.js';

/** Subpath and directory name of the library's metadata entry point. */
const metadataEntryPoint = 'metadata';

/** Base name of the metadata public API file used by the library templates, without `.ts`. */
export const LIBRARY_METADATA_ENTRY_FILE_NAME = 'public-api';

/** Metadata entry point name and TypeScript source path relative to the library root. */
export const LIBRARY_METADATA_ENTRY = {
  entryPoint: metadataEntryPoint,
  entryFile: `./${metadataEntryPoint}/src/${LIBRARY_METADATA_ENTRY_FILE_NAME}.ts`
};

/** Whether the library uses either Angular ng-packagr builder. */
export function usesNgPackagr(project: ProjectDefinition): boolean {
  const builder = project.targets.get('build')?.builder;
  // eslint-disable-next-line @typescript-eslint/no-deprecated -- Support libraries that use ng-packagr.
  return builder === AngularBuilder.BuildNgPackagr || builder === AngularBuilder.NgPackagr;
}

/**
 * Resolves a library's TypeScript entry file from `package.json` exports or legacy `ng-package.json`.
 * @param tree Schematic tree containing the library's manifests.
 * @param project Library project definition.
 * @param entryPoint Secondary entry point name such as `metadata`, or an empty string for the primary entry point.
 * @returns The entry file path in the schematic tree, or `undefined` if no entry file is configured.
 */
export function getEntryFilePath(
  tree: Tree,
  project: ProjectDefinition,
  entryPoint: string
): string | undefined {
  const projectRoot = normalize(project.root);
  const ngPackagePath = join(projectRoot, entryPoint, 'ng-package.json');
  if (
    project.targets.get('build')?.builder !== AngularBuilder.BuildLibrary &&
    tree.exists(ngPackagePath)
  ) {
    const legacyEntryFile = new JSONFile(tree, ngPackagePath).get(['lib', 'entryFile']);
    if (typeof legacyEntryFile === 'string' && legacyEntryFile) {
      return join(projectRoot, entryPoint, legacyEntryFile);
    }
  }

  const packagePath = join(projectRoot, 'package.json');
  if (!tree.exists(packagePath)) {
    return;
  }

  const exportKey = entryPoint ? `./${entryPoint}` : '.';
  const entryFile = new JSONFile(tree, packagePath).get(['exports', exportKey]);

  if (typeof entryFile === 'string' && /(?<!\.d)\.m?ts$/.test(entryFile)) {
    return join(projectRoot, entryFile);
  }
}

/**
 * Finds the first TypeScript file re-exported by a library entry point that matches the filter.
 * @param tree Schematic tree containing the library sources.
 * @param project Library project definition.
 * @param entryPoint Secondary entry point name, or an empty string for the primary entry point.
 * @param filterFn Predicate applied to each re-export's module specifier.
 * @returns The matching source path, or `undefined` if the entry point or re-export cannot be found.
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
