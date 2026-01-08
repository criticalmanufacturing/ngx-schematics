import { Tree } from '@angular-devkit/schematics';
import {
  createSourceFile,
  getDefaultApplicationProject,
  getMainPath,
  getRelativeImportPath
} from '@criticalmanufacturing/schematics-devkit';
import { ObjectLiteralExpression, SyntaxKind } from 'ts-morph';

/**
 * Retrieves the application config for the default application project
 */
export async function getDefaultAppConfig(
  tree: Tree
): Promise<ObjectLiteralExpression | undefined> {
  const project = await getDefaultApplicationProject(tree);

  if (!project) {
    return;
  }

  return getAppConfig(tree, project);
}

/**
 * Retrieves the application config object literal
 */
export async function getAppConfig(
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
