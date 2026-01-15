import { ObjectLiteralExpression, SourceFile, SyntaxKind } from 'ts-morph';
import {
  addSymbolToArrayLiteral,
  createSourceFile,
  getObjectProperty,
  insertImport
} from '@criticalmanufacturing/schematics-devkit';
import { Rule, Tree } from '@angular-devkit/schematics';
import { getAppConfig } from '../../utility/app-config';
import { addSymbolToNgModuleMetadata, getAppModulePath } from '../../utility/ng-module';

/**
 * Injects Zone-based change detection into the provided app config object.
 * @param appConfig The app config object
 */
export function injectZoneDetectionOnAppConfig(appConfig: ObjectLiteralExpression | undefined) {
  if (!appConfig) {
    return;
  }

  const arrLiteral = getObjectProperty(appConfig, 'providers')
    ?.asKind(SyntaxKind.PropertyAssignment)
    ?.getInitializerIfKind(SyntaxKind.ArrayLiteralExpression);

  if (!arrLiteral) {
    return;
  }

  // we're forcing zone change detection, because Angular 21 no longer does it by default
  insertImport(appConfig.getSourceFile(), 'provideZoneChangeDetection', '@angular/core', false);

  addSymbolToArrayLiteral(
    arrLiteral,
    '\n' + `provideZoneChangeDetection({ eventCoalescing: true })`
  );
}

/**
 * Injects Zone-based change detection into the provided app module file.
 * @param sourceFile The app module source file
 */
export function injectZoneDetectionOnAppModule(sourceFile: SourceFile) {
  addSymbolToNgModuleMetadata(
    sourceFile,
    'providers',
    'provideZoneChangeDetection({ eventCoalescing: true })',
    '@angular/core'
  );
}

/**
 * Schematics rule to add zone change detection to the app config file.
 * @param project The project name
 * @returns The schematics rule
 */
export function addZoneChangeDetectionAppConfig(project: string): Rule {
  return async (tree: Tree) => {
    const appConfig = await getAppConfig(tree, project);

    if (!appConfig) {
      return;
    }

    const sourceFile = appConfig?.getSourceFile();

    injectZoneDetectionOnAppConfig(appConfig);

    sourceFile.formatText({ indentSize: 2 });
    tree.overwrite(sourceFile.getFilePath(), sourceFile.getFullText());
  };
}

export function addZoneChangeDetectionAppModule(project: string): Rule {
  return async (tree: Tree) => {
    const appModulePath = await getAppModulePath(tree, project);

    if (!appModulePath) {
      return;
    }

    const sourceFile = createSourceFile(tree, appModulePath);

    if (!sourceFile) {
      return;
    }

    injectZoneDetectionOnAppModule(sourceFile);

    sourceFile.formatText({ indentSize: 2 });
    tree.overwrite(sourceFile.getFilePath(), sourceFile.getFullText());
  };
}
