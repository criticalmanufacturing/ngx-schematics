import { Tree } from '@angular-devkit/schematics';
import { ObjectLiteralExpression, SourceFile, SyntaxKind } from 'ts-morph';
import {
  addSymbolToArrayLiteral,
  createSourceFile,
  getRelativeImportPath,
  getMainPath,
  getObjectProperty,
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

  return getRelativeImportPath(source, bootstrapArg);
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
  importPath?: string,
  insertBefore?: string
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

    if (importPath) {
      insertImport(source, symbolName.replace(/\..*$/, ''), importPath);
    }

    return;
  }

  const assignment = metadataProperty.asKind(SyntaxKind.PropertyAssignment);
  const arrLiteral = assignment?.getInitializer()?.asKind(SyntaxKind.ArrayLiteralExpression);

  if (!arrLiteral) {
    return;
  }

  addSymbolToArrayLiteral(arrLiteral, symbolName, insertBefore);

  if (importPath) {
    insertImport(source, symbolName.replace(/\..*$/, ''), importPath);
  }
}

/**
 * Gets the bootstrap component file location
 * @param source the app module source file
 * @returns the file location or undefined if not found
 */
export function getNgModuleBootstrapComponentPath(source: SourceFile): string | undefined {
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

  const bootstrapProperty = getObjectProperty(metadataNode, 'bootstrap')?.asKindOrThrow(
    SyntaxKind.PropertyAssignment
  );

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
 * Removes a symbol from a ng module metadata
 * @param source the source file containing a module
 * @param metadataField the metadata field of the module
 * @param symbolName the symbol from the metadata fild to remove
 */
export function removeSymbolFromNgModuleMetadata(
  source: SourceFile,
  metadataField: string,
  symbolName: string
): void {
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

  const metadataProperty = decoratorMetadata
    .getProperty(metadataField)
    ?.asKind(SyntaxKind.PropertyAssignment);

  if (!metadataProperty) {
    return;
  }

  const arrLiteral = metadataProperty.getInitializer()?.asKind(SyntaxKind.ArrayLiteralExpression);

  if (arrLiteral) {
    const toRemove = arrLiteral
      .getElements()
      .findIndex((node) => node.asKind(SyntaxKind.Identifier)?.getText() === symbolName);

    if (toRemove >= 0) {
      arrLiteral.removeElement(toRemove);
    }
  }

  const leftOverNodes = source
    .getDescendantsOfKind(SyntaxKind.Identifier)
    .filter((node) => node.getText() === symbolName);

  if (leftOverNodes.length === 1) {
    const importDec = leftOverNodes[0].getFirstAncestorByKind(SyntaxKind.ImportDeclaration);

    if (!importDec || importDec.getNamespaceImport()) {
      return;
    }

    if (importDec.getNamedImports().length === 1) {
      importDec.remove();
    }

    importDec
      .getNamedImports()
      .find((node) => node.getName() === symbolName)
      ?.remove();
  }
}
