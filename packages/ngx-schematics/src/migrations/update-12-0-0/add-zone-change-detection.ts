import { ObjectLiteralExpression, SyntaxKind } from 'ts-morph';
import {
  addSymbolToArrayLiteral,
  getObjectProperty,
  insertImport
} from '@criticalmanufacturing/schematics-devkit';
import { Rule, Tree } from '@angular-devkit/schematics';
import { getAppConfig } from '../../utility/app-config';

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
  insertImport(
    appConfig.getSourceFile(),
    'provideZoneChangeDetection',
    '@angular/core',
    false,
    ' ',
    ' '
  );

  addSymbolToArrayLiteral(
    arrLiteral,
    '\n' + `provideZoneChangeDetection({ eventCoalescing: true })`
  );
}

/**
 * Schematics rule to add zone change detection to the app config file.
 * @param project The project name
 * @returns The schematics rule
 */
export function addZoneChangeDetection(project: string): Rule {
  return async (tree: Tree) => {
    console.debug('Adding zone-based change detection to the app config...');

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
