import { basename, join, normalize } from '@angular-devkit/core';
import {
  apply,
  applyTemplates,
  chain,
  mergeWith,
  move,
  noop,
  Rule,
  Tree,
  url
} from '@angular-devkit/schematics';
import { readWorkspace } from '@schematics/angular/utility';
import { getDependency } from '@schematics/angular/utility/dependency';

import {
  createSourceFile,
  strings,
  getDefaultAppProjectName,
  getObjectProperty,
  addSymbolToArrayLiteral,
  insertImport,
  LIBRARY_METADATA_ENTRY,
  LIBRARY_METADATA_ENTRY_FILE_NAME
} from '@criticalmanufacturing/schematics-devkit';
import {
  addLibraryTsTypes,
  applyLibraryDefaultConfigs,
  generateAngularLibrary,
  registerLibraryEntryPoint
} from '@criticalmanufacturing/schematics-devkit/rules';
import { Schema } from './schema.js';
import { addSymbolToNgModuleMetadata, getAppModulePath } from '../utility/ng-module.js';
import { getDefaultAppConfig } from '../utility/app-config.js';
import { SyntaxKind } from 'ts-morph';
import { METADATA_ROUTING_PROVIDE } from '../ng-add/package-configs.js';

function updateAppConfig(options: { packageName: string; namePrefix: string }): Rule {
  return async (tree: Tree) => {
    const appConfig = await getDefaultAppConfig(tree);

    if (!appConfig) {
      return;
    }

    const arrLiteral = getObjectProperty(appConfig, 'providers')
      ?.asKind(SyntaxKind.PropertyAssignment)
      ?.getInitializerIfKind(SyntaxKind.ArrayLiteralExpression);

    if (!arrLiteral) {
      return;
    }

    addSymbolToArrayLiteral(
      arrLiteral,
      `\nprovide${strings.classify(options.namePrefix)}()`,
      METADATA_ROUTING_PROVIDE[1]
    );
    insertImport(
      arrLiteral.getSourceFile(),
      `provide${strings.classify(options.namePrefix)}`,
      options.packageName
    );

    arrLiteral.getSourceFile().formatText();
    tree.overwrite(
      arrLiteral.getSourceFile().getFilePath(),
      arrLiteral.getSourceFile().getFullText()
    );
  };
}

function updateAppModule(options: { packageName: string; namePrefix: string }): Rule {
  return async (tree: Tree) => {
    const project = await getDefaultAppProjectName(tree);

    if (!project) {
      return;
    }

    const modulePath = await getAppModulePath(tree, project);

    if (!modulePath) {
      return;
    }

    const source = createSourceFile(tree, modulePath);

    if (!source) {
      return;
    }

    addSymbolToNgModuleMetadata(
      source,
      'imports',
      `${strings.classify(options.namePrefix)}MetadataModule`,
      options.packageName,
      'CoreModule'
    );

    tree.overwrite(modulePath, source.getFullText());
  };
}

/**
 * Generates the library's metadata entry point and registers it with the default application when present.
 * @param options Library project name and whether to skip workspace TypeScript path mappings.
 */
function createMetadataSubEntry(options: Pick<Schema, 'name' | 'skipTsConfig'>): Rule {
  return async (host: Tree) => {
    const workspace = await readWorkspace(host);
    const project = workspace.projects.get(options.name);

    if (!project) {
      return;
    }

    const fullName = strings.dasherize(options.name);
    const packageName = `${fullName}/${LIBRARY_METADATA_ENTRY.entryPoint}`;
    const namePrefix = basename(normalize(fullName)).replace(/^cmf-/, '');

    const templateSource = apply(url('./files'), [
      applyTemplates({
        ...strings,
        fullName,
        name: namePrefix,
        entryFile: LIBRARY_METADATA_ENTRY_FILE_NAME
      }),
      move(join(normalize(project.root), LIBRARY_METADATA_ENTRY.entryPoint))
    ]);

    return chain([
      mergeWith(templateSource),
      registerLibraryEntryPoint({
        project,
        projectName: options.name,
        ...LIBRARY_METADATA_ENTRY,
        skipTsConfig: options.skipTsConfig
      }),
      updateAppModule({ packageName, namePrefix }),
      updateAppConfig({ packageName, namePrefix })
    ]);
  };
}

/**
 * Generates an Angular UI library with optional metadata integration.
 * @param _options Library generation options, including whether to skip metadata.
 */
export default function (_options: Schema): Rule {
  return () => {
    if (!_options.prefix) {
      const folderName = basename(normalize(_options.name));

      if (/[A-Z]/.test(folderName)) {
        _options.prefix = strings.dasherize(folderName);
      }
    }

    const skipMetadata = _options.skipMetadata;
    delete _options.skipMetadata;

    return chain([
      generateAngularLibrary(_options),
      applyLibraryDefaultConfigs(_options),
      (tree: Tree) => {
        if (getDependency(tree, '@angular/localize')) {
          return addLibraryTsTypes(_options.name, ['@angular/localize']);
        }
      },
      !skipMetadata ? createMetadataSubEntry(_options) : noop()
    ]);
  };
}
