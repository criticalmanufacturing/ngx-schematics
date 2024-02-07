import { Rule, Tree } from '@angular-devkit/schematics';
import { Schema } from '../schema';
import { ObjectLiteralExpression, SyntaxKind } from 'ts-morph';
import {
  addSymbolToArrayLiteral,
  createSourceFile,
  getRelativeImportPath,
  getMainPath,
  getObjectProperty,
  insertImport
} from '@criticalmanufacturing/schematics-devkit';
import { CORE_BASE_PROVIDE, MES_BASE_PROVIDE, METADATA_ROUTING_PROVIDE } from '../package-configs';
import { updateServiceWorker } from '../../migrations/update-1-2-0/update-service-worker';

/**
 * Reatrives the application config object literal
 */
async function getAppConfig(
  tree: Tree,
  project: string
): Promise<ObjectLiteralExpression | undefined> {
  const mainPath = await getMainPath(tree, project);

  if (!mainPath) {
    return;
  }

  const mainSource = createSourceFile(tree, mainPath);

  if (!mainSource) {
    return;
  }

  const bootstrapAppCall = mainSource
    .getDescendantsOfKind(SyntaxKind.CallExpression)
    .find((descNode) => descNode.getExpression().getText().endsWith('bootstrapApplication'));

  if (!bootstrapAppCall) {
    return;
  }

  const appConfigNode = bootstrapAppCall.getArguments()[1];
  const appConfigPath = getRelativeImportPath(mainSource, appConfigNode);

  if (!appConfigPath) {
    return;
  }

  const appConfig = createSourceFile(tree, appConfigPath);

  if (!appConfig) {
    return;
  }

  return appConfig
    .getDescendantsOfKind(SyntaxKind.VariableDeclaration)
    .find(
      (descNode) => descNode.getName() === appConfigNode.asKind(SyntaxKind.Identifier)?.getText()
    )
    ?.getInitializerIfKind(SyntaxKind.ObjectLiteralExpression);
}

/**
 * Updates the application config providers base on the provided application type
 */
export function updateAppConfig(options: {
  application: Schema['application'];
  project: string;
}): Rule {
  return async (tree: Tree) => {
    const appConfig = await getAppConfig(tree, options.project);

    if (!appConfig) {
      return;
    }

    const arrLiteral = getObjectProperty(appConfig, 'providers')
      ?.asKind(SyntaxKind.PropertyAssignment)
      ?.getInitializerIfKind(SyntaxKind.ArrayLiteralExpression);

    if (!arrLiteral) {
      return;
    }

    if (options.application === 'MES') {
      addSymbolToArrayLiteral(arrLiteral, MES_BASE_PROVIDE[1]);
      insertImport(
        arrLiteral.getSourceFile(),
        MES_BASE_PROVIDE[1].replace(/\(\)$/, ''),
        MES_BASE_PROVIDE[0]
      );
    } else {
      addSymbolToArrayLiteral(arrLiteral, CORE_BASE_PROVIDE[1]);
      insertImport(
        arrLiteral.getSourceFile(),
        CORE_BASE_PROVIDE[1].replace(/\(\)$/, ''),
        CORE_BASE_PROVIDE[0]
      );
    }

    addSymbolToArrayLiteral(arrLiteral, METADATA_ROUTING_PROVIDE[1]);
    insertImport(
      arrLiteral.getSourceFile(),
      METADATA_ROUTING_PROVIDE[1].replace(/\(\)$/, ''),
      METADATA_ROUTING_PROVIDE[0]
    );

    updateServiceWorker(arrLiteral);

    arrLiteral.getSourceFile().formatText();
    tree.overwrite(
      arrLiteral.getSourceFile().getFilePath(),
      arrLiteral.getSourceFile().getFullText()
    );
  };
}
