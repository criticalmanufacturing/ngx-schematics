import { dirname, join, normalize } from '@angular-devkit/core';
import { Tree } from '@angular-devkit/schematics';
import { ObjectLiteralExpression, SourceFile, SyntaxKind } from 'ts-morph';
import {
  createSourceFile,
  getMainPath,
  insertImport
} from '@criticalmanufacturing/schematics-devkit';

/**
 * Finds de application module path
 * @param tree Tree
 * @param project application project name
 */
export async function getAppModulePath(tree: Tree, project: string): Promise<string | undefined> {
  const mainPath = await getMainPath(tree, project);

  if (!mainPath) {
    return;
  }

  const mainSource = createSourceFile(tree, mainPath);

  if (!mainSource) {
    return;
  }

  return findBootstrapModulePath(mainSource);
}

/**
 * Finds the bootstrap module path from the main.ts file
 * @param source main.ts source file
 */
export function findBootstrapModulePath(source: SourceFile): string | undefined {
  const bootstrapCall = source
    .getDescendantsOfKind(SyntaxKind.CallExpression)
    .find((descNode) => descNode.getExpression().getText().endsWith('bootstrapModule'));

  if (!bootstrapCall) {
    return;
  }

  const bootstrapArg = bootstrapCall.getArguments()[0];

  if (!bootstrapArg) {
    return;
  }

  let moduleRelativePath: string | undefined;
  if (bootstrapArg.getKind() === SyntaxKind.Identifier) {
    moduleRelativePath = source
      .getImportDeclarations()
      .find((impNode) =>
        impNode.getNamedImports().some((imp) => imp.getName() === bootstrapArg.getText())
      )
      ?.getModuleSpecifierValue();
  } else if (bootstrapArg.getKind() === SyntaxKind.PropertyAccessExpression) {
    moduleRelativePath = source
      .getDescendantsOfKind(SyntaxKind.CallExpression)
      .find((node) => node.getExpression().getText() === 'import')
      ?.getArguments()[0]
      ?.asKind(SyntaxKind.StringLiteral)
      ?.getLiteralValue();
  }

  if (!moduleRelativePath) {
    return;
  }

  return join(dirname(normalize(source.getFilePath())), moduleRelativePath) + '.ts';
}

/**
 * Adds a symbol to a ng module decorator metadata
 * @param source file to insert the symbol on
 * @param metadataField metadata field to insert the symbol
 * @param symbolName Symbol to insert
 * @param importPath import path of the symbol
 * @param insertBefore token that implies that the symbol must be inserted before
 * @returns
 */
export function addSymbolToNgModuleMetadata(
  source: SourceFile,
  metadataField: string,
  symbolName: string,
  importPath: string | null = null,
  insertBefore: string | null = null
): void {
  // Find the decorator declaration.
  let decoratorMetadata: ObjectLiteralExpression | undefined;
  for (const classNode of source.getClasses()) {
    decoratorMetadata = classNode
      .getDecorator('NgModule')
      ?.getArguments()[0]
      ?.asKind(SyntaxKind.ObjectLiteralExpression);

    if (decoratorMetadata) {
      break;
    }
  }

  if (!decoratorMetadata) {
    return;
  }

  // Get all the children property assignment of object literals.
  const metadataProperty = decoratorMetadata.getProperty(metadataField);

  if (!metadataProperty) {
    // We haven't found the field in the metadata declaration. Insert a new field.
    decoratorMetadata.addPropertyAssignment({
      name: metadataField,
      initializer: `[\n${symbolName}\n]`
    });

    if (importPath !== null) {
      insertImport(source, symbolName.replace(/\..*$/, ''), importPath);
    }

    return;
  }

  const assignment = metadataProperty.asKind(SyntaxKind.PropertyAssignment);
  const arrLiteral = assignment?.getInitializer()?.asKind(SyntaxKind.ArrayLiteralExpression);

  if (!arrLiteral) {
    return;
  }

  if (arrLiteral.getElements().some((elem) => elem.getText() === symbolName)) {
    return;
  }

  let index = arrLiteral.getElements().length;

  if (insertBefore) {
    index = arrLiteral.getElements().findIndex((elem) => elem.getText() === insertBefore) ?? index;
  }

  arrLiteral.insertElement(index, symbolName);

  if (importPath !== null) {
    insertImport(source, symbolName.replace(/\..*$/, ''), importPath);
  }
}
