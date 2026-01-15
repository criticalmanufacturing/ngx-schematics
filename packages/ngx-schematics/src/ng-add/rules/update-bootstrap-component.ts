import { dirname, join, normalize } from '@angular-devkit/core';
import { Tree } from '@angular-devkit/schematics';
import { ObjectLiteralExpression, SourceFile, SyntaxKind } from 'ts-morph';
import {
  createSourceFile,
  getRelativeImportPath,
  getMainPath,
  getObjectProperty,
  removeImport
} from '@criticalmanufacturing/schematics-devkit';
import { getNgModuleBootstrapComponentPath } from '../../utility/ng-module.js';

/**
 * Gets the bootstrap component file location
 * @param source the app module source file
 * @returns the file location or undefined if not found
 */
async function getBootstrapComponentPath(tree: Tree, project: string): Promise<string | undefined> {
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

  if (bootstrapAppCall) {
    return getRelativeImportPath(mainSource, bootstrapAppCall.getArguments()[0]);
  }

  const bootstrapModuleCall = mainSource
    .getDescendantsOfKind(SyntaxKind.CallExpression)
    .find((descNode) => descNode.getExpression().getText().endsWith('bootstrapModule'));

  if (bootstrapModuleCall) {
    const appModulePath = getRelativeImportPath(mainSource, bootstrapModuleCall.getArguments()[0]);
    if (!appModulePath) {
      return;
    }

    const appModule = createSourceFile(tree, appModulePath);

    if (!appModule) {
      return;
    }

    const relCompPath = getNgModuleBootstrapComponentPath(appModule);

    if (!relCompPath) {
      return;
    }

    return join(dirname(normalize(appModulePath)), relCompPath);
  }
}

/**
 * Gets the component decorator metadata object literal
 * @param source component source file
 * @returns the decorator metadata
 */
function getComponentMetadata(source: SourceFile): ObjectLiteralExpression | undefined {
  // Find the decorator declaration.
  let compMetadata: ObjectLiteralExpression | undefined;
  for (const classNode of source.getClasses()) {
    compMetadata = classNode
      .getDecorator('Component')
      ?.getArguments()[0]
      ?.asKind(SyntaxKind.ObjectLiteralExpression);

    if (compMetadata) {
      return compMetadata;
    }
  }
}

/**
 * Updates the bootstrap component:
 * 1. Adds the router directive in the component template
 */
export function updateBootstrapComponent(options: { project: string }) {
  return async (tree: Tree) => {
    const compPath = await getBootstrapComponentPath(tree, options.project);

    if (!compPath) {
      return;
    }

    const compSource = createSourceFile(tree, compPath);

    if (!compSource) {
      return;
    }

    const compMetadata = getComponentMetadata(compSource);

    if (!compMetadata) {
      return;
    }

    // Remove all members
    for (const classNode of compSource.getClasses()) {
      if (classNode.getDecorator('Component')) {
        classNode.getMembers().forEach((node) => {
          node.remove();
        });
      }
    }

    removeImport(compSource, 'signal', '@angular/core');

    const templateNode = getObjectProperty(compMetadata, 'template')
      ?.asKindOrThrow(SyntaxKind.PropertyAssignment)
      ?.getInitializer()
      ?.asKind(SyntaxKind.StringLiteral);
    const templateUrlNode = getObjectProperty(compMetadata, 'templateUrl')
      ?.asKindOrThrow(SyntaxKind.PropertyAssignment)
      ?.getInitializer()
      ?.asKind(SyntaxKind.StringLiteral);

    if (templateNode) {
      templateNode.replaceWithText('<router-outlet></router-outlet>');
    } else if (templateUrlNode) {
      const templateUrl = templateUrlNode.getLiteralValue();
      const templatePath = join(dirname(normalize(compPath)), templateUrl);
      tree.overwrite(templatePath, '<router-outlet></router-outlet>');
    }

    tree.overwrite(compPath, compSource.getFullText());
  };
}
