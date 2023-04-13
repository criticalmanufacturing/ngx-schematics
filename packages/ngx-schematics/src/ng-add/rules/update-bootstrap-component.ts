import { dirname, join, normalize } from '@angular-devkit/core';
import { Tree } from '@angular-devkit/schematics';
import { ObjectLiteralExpression, PropertyAssignment, SourceFile, SyntaxKind } from 'ts-morph';
import { createSourceFile } from '@criticalmanufacturing/schematics-devkit';
import { getAppModulePath } from '../../utility/ng-module';

/**
 * Gets the bootstrap component file location
 * @param source the app module source file
 * @returns the file location or undefined if not found
 */
async function getBootstrapComponentPath(source: SourceFile): Promise<string | undefined> {
  let metadataNode: ObjectLiteralExpression | undefined;
  for (const classNode of source.getClasses()) {
    metadataNode = classNode
      .getDecorator('NgModule')
      ?.getArguments()[0]
      ?.asKind(SyntaxKind.ObjectLiteralExpression);

    if (metadataNode) {
      break;
    }
  }

  if (!metadataNode) {
    return;
  }

  const bootstrapProperty = getMetadataProperty(metadataNode, 'bootstrap');

  if (!bootstrapProperty) {
    return;
  }

  const arrLiteral = bootstrapProperty.getInitializer()?.asKind(SyntaxKind.ArrayLiteralExpression);

  const componentSymbol = arrLiteral?.getElements()[0]?.getText();

  if (!componentSymbol) {
    return;
  }

  const relativePath = source
    .getImportDeclarations()
    .find((impDec) => impDec.getNamedImports().some((imp) => imp.getName() === componentSymbol))
    ?.getModuleSpecifierValue();

  return relativePath + '.ts';
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
 * Gets the desired property from the component decorator object
 * @param metadata decorator object literal
 * @param propertyName object property name
 * @returns the object property
 */
function getMetadataProperty(
  metadata: ObjectLiteralExpression,
  propertyName: string
): PropertyAssignment | undefined {
  return metadata
    .getProperties()
    .find((prop) => prop.asKind(SyntaxKind.PropertyAssignment)?.getName() === propertyName)
    ?.asKindOrThrow(SyntaxKind.PropertyAssignment);
}

/**
 * Updates the bootstrap component:
 * 1. Adds the router directive in the component template
 */
export function updateBootstrapComponent(options: { project: string }) {
  return async (tree: Tree) => {
    const modulePath = await getAppModulePath(tree, options.project);

    if (!modulePath) {
      return;
    }

    const moduleSource = createSourceFile(tree, modulePath);

    if (!moduleSource) {
      return;
    }

    const compPath = await getBootstrapComponentPath(moduleSource);

    if (!compPath) {
      return;
    }

    const compFilePath = join(dirname(normalize(modulePath)), compPath);
    const compSource = createSourceFile(tree, compFilePath);

    if (!compSource) {
      return;
    }

    const compMetadata = getComponentMetadata(compSource);

    if (!compMetadata) {
      return;
    }

    const templateNode = getMetadataProperty(compMetadata, 'template')
      ?.getInitializer()
      ?.asKind(SyntaxKind.StringLiteral);
    const templateUrlNode = getMetadataProperty(compMetadata, 'templateUrl')
      ?.getInitializer()
      ?.asKind(SyntaxKind.StringLiteral);

    if (templateNode) {
      templateNode.replaceWithText('<router-outlet></router-outlet>');
      tree.overwrite(compPath, compSource.getFullText());
    } else if (templateUrlNode) {
      const templateUrl = templateUrlNode.getLiteralValue();
      const templatePath = join(dirname(compFilePath), templateUrl);
      tree.overwrite(templatePath, '<router-outlet></router-outlet>');
    }
  };
}
