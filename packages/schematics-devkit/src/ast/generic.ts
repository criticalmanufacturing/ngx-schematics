import { dirname, isAbsolute, join, normalize } from '@angular-devkit/core';
import { Tree } from '@angular-devkit/schematics';
import {
  ArrayLiteralExpression,
  Identifier,
  ImportSpecifier,
  Node,
  ObjectLiteralElementLike,
  ObjectLiteralExpression,
  Project,
  QuoteKind,
  SourceFile,
  StructureKind,
  SyntaxKind,
  TypeNode
} from 'ts-morph';

/**
 * Finds all references to a given identifier within a specified root node.
 *
 * @param identifier - The identifier to search for references.
 * @param root - The root node to search within.
 * @returns An array of Identifier nodes that reference the given identifier.
 */
export function findReferences(node: Identifier | TypeNode, root: Node): Identifier[] {
  const nodeText = node.getText();

  return root.getDescendantsOfKind(SyntaxKind.Identifier).filter((n) => {
    if (n === node || n.getText() !== nodeText) {
      return false;
    }

    const parentExp = n.getParentWhileKind(SyntaxKind.PropertyAccessExpression);
    if (parentExp && parentExp.getExpression() !== n) {
      return false;
    }

    return true;
  });
}

/**
 * Gets the a ts source file
 */
export function createSourceFile(tree: Tree, path: string): SourceFile | undefined {
  const content = tree.get(path)?.content.toString('utf-8');

  if (!content) {
    return;
  }

  if (!isAbsolute(normalize(path))) {
    path = '/' + path;
  }

  return new Project({
    manipulationSettings: {
      quoteKind: QuoteKind.Single
    }
  }).createSourceFile(path, content, { overwrite: true });
}

/**
 * Inserts an import Declaration in a file
 * @param source Source File
 * @param symbolName Import symbol
 * @param module Import module specifier
 * @param isDefault Is default import
 */
export function insertImport(
  source: SourceFile,
  symbolName: string,
  module: string,
  isDefault = false
): void {
  const allImports = source.getImportDeclarations();
  const importNode = allImports.find((node) => node.getModuleSpecifierValue() === module);

  if (isDefault) {
    if (importNode?.getNamespaceImport()) {
      return;
    }

    source.addImportDeclaration({ moduleSpecifier: module, defaultImport: '' });
  } else if (importNode) {
    const namedImports = importNode.getNamedImports();

    if (namedImports.find((node) => node.getName() === symbolName)) {
      return;
    }

    importNode
      .addNamedImport({
        name: symbolName,
        leadingTrivia: '\n',
        trailingTrivia: '\n'
      })
      .formatText({ indentSize: getIndentSize(source) });
  } else {
    source.addImportDeclaration({
      moduleSpecifier: module,
      namedImports: [symbolName]
    });
  }
}

/**
 * Inserts an export declaration in a file
 * @param source Source File
 * @param symbolName Export symbol
 * @param module Export module specifier
 * @param isDefault Is Default Export
 */
export function insertExport(
  source: SourceFile,
  symbolName: string,
  module: string,
  isDefault = false,
  leadingTrivia?: string
): void {
  const allExports = source.getExportDeclarations();
  const exportNode = allExports.find((node) => node.getModuleSpecifierValue() === module);

  if (isDefault) {
    if (exportNode?.isNamespaceExport()) {
      return;
    }

    source.addExportDeclaration({ moduleSpecifier: module, leadingTrivia });
  } else if (exportNode) {
    const namedExports = exportNode.getNamedExports();

    if (namedExports.find((node) => node.getName() === symbolName)) {
      return;
    }

    exportNode.addNamedExport(symbolName);
  } else {
    source.addExportDeclaration({
      namedExports: [symbolName],
      moduleSpecifier: module,
      leadingTrivia
    });
  }
}

/**
 * Removes an import declaration in a file
 * @param source Source File
 * @param symbolName Import symbol
 * @param module Import module specifier
 */
export function removeImport(source: SourceFile, symbolName: string, module: string): void {
  const allImports = source.getImportDeclarations();
  const importNode = allImports.find((node) => node.getModuleSpecifierValue() === module);

  if (importNode) {
    const namedImports = importNode.getNamedImports();

    if (importNode.getNamedImports().length > 1) {
      namedImports.find((node) => node.getName() === symbolName)?.remove();
    } else {
      importNode.remove();
    }
  }
}

/**
 * Updates the package info object property addding new elements
 * @param objectExpression ObjectLiteralExpression
 * @param elements elements to add
 * @returns
 */
export function updateObjectArrayProperty(
  objectExpression: ObjectLiteralExpression,
  propertyName: string,
  elements: string[]
) {
  if (!objectExpression.getProperty(propertyName)) {
    objectExpression.addProperty({
      kind: StructureKind.PropertyAssignment,
      name: propertyName,
      initializer: '[]'
    });
  }

  const property = objectExpression
    .getProperty(propertyName)
    ?.asKind(SyntaxKind.PropertyAssignment);

  if (!property) {
    return;
  }

  const array = property.getInitializer()?.asKind(SyntaxKind.ArrayLiteralExpression);

  if (!array) {
    return;
  }

  const elementsToAdd = elements.filter(
    (e) =>
      !array
        .getElements()
        .map((node) => node.getText())
        .includes(e)
  );

  if (elementsToAdd.length === 0) {
    return;
  }

  const indentSize = getIndentSize(objectExpression.getSourceFile()) ?? 4;

  array.addElements(
    elementsToAdd.map((e) => "'" + e + "'"),
    { useNewLines: true }
  );
  array.formatText({ indentSize });

  const loader = objectExpression.getProperty('loader');

  if (!loader) {
    return;
  }

  const loaderText = loader.getText();
  const exportsMatch = /webpackExports\s*:\s*\[([^\]]*?)(\s*\])/.exec(loaderText);
  const indentation =
    /([\t ]*)(?=\/\*\s*webpackExports)/.exec(loaderText)?.[1] ?? loader.getIndentationText();

  if (exportsMatch) {
    const insertIndex = exportsMatch.index + exportsMatch[0].length - exportsMatch[2].length;
    loader.replaceWithText(
      loaderText.slice(0, insertIndex) + // ... webpackExports: [...
        (exportsMatch[1].trim().length > 0 ? ',' : '') +
        `\n${indentation + ' '.repeat(indentSize)}"${elementsToAdd.join(`",\n${indentation}"`)}"` +
        (exportsMatch[2].length === 1 ? `\n${indentation}` : '') +
        loaderText.slice(insertIndex, loaderText.length) // ] ...
    );
  }

  loader.formatText({ indentSize });
}

/**
 * Retrives the import specifier of the given node
 * @param node the node to search the import
 */
export function getImportSpecifier(node: Node): ImportSpecifier | undefined {
  return node
    .getSourceFile()
    .getImportDeclarations()
    .flatMap((impNode) => impNode.getNamedImports())
    .find((imp) => (imp.getAliasNode()?.getText() ?? imp.getName()) === node.getText());
}

/**
 * Retrives the import path of the given node
 * @param node the node to search the import
 */
export function getImportPath(node: Node): string | undefined {
  const importPath =
    getImportSpecifier(node)?.getImportDeclaration().getModuleSpecifierValue() ??
    node
      .getSourceFile()
      .getDescendantsOfKind(SyntaxKind.CallExpression)
      .find((node) => node.getExpression().getText() === 'import')
      ?.getArguments()[0]
      ?.asKind(SyntaxKind.StringLiteral)
      ?.getLiteralValue();

  return importPath;
}

/**
 * Retrives the import path of the given node relative to the provided source file
 * @param source the source file
 * @param node the node to search the import
 */
export function getRelativeImportPath(source: SourceFile, node: Node): string | undefined {
  const moduleRelativePath = getImportPath(node);

  if (!moduleRelativePath) {
    return;
  }

  return join(dirname(normalize(source.getFilePath())), moduleRelativePath) + '.ts';
}

/**
 * Gets the desired property from the object
 * @param object object literal
 * @param propertyName object property name
 * @returns the object property
 */
export function getObjectProperty(
  object: ObjectLiteralExpression,
  propertyName: string
): ObjectLiteralElementLike | undefined {
  return object
    .getProperties()
    .find((prop) => prop.asKind(SyntaxKind.PropertyAssignment)?.getName() === propertyName);
}

/**
 * Adds a symbol to an array literal
 * @param arryaLiteral the array literal node
 * @param toInsert the symbol to insert
 * @param before the symbol to insert before
 * @returns
 */
export function addSymbolToArrayLiteral(
  arryaLiteral: ArrayLiteralExpression,
  toInsert: string,
  before?: string
): void {
  if (arryaLiteral.getElements().some((elem) => elem.getText() === toInsert.trim())) {
    return;
  }

  let index = arryaLiteral.getElements().length;

  if (before) {
    const beforeIndex = arryaLiteral.getElements().findIndex((elem) => elem.getText() === before);

    if (beforeIndex >= 0) {
      index = beforeIndex;
    }
  }

  arryaLiteral.insertElement(index, toInsert);
}

/**
 * Removes a symbol from an array literal
 * @param arryaLiteral the array literal node
 * @param toInsert the symbol to remove
 * @returns
 */
export function removeSymbolFromArrayLiteral(
  arryaLiteral: ArrayLiteralExpression,
  toRemove: string
): void {
  const index = arryaLiteral.getElements().findIndex((elem) => elem.getText() === toRemove);

  if (index < 0) {
    return;
  }

  arryaLiteral.removeElement(index);
}

/**
 * Determines the indentation size used in the source file.
 * @param sourceFile The SourceFile to analyze.
 * @returns The number of spaces used for indentation, or undefined if no indentation is found.
 */
export function getIndentSize(sourceFile: SourceFile): number | undefined {
  const code = sourceFile.getFullText();
  const lines = code.split(/\r?\n/);

  for (const line of lines) {
    const match = line.match(/^(\s+)\S/);
    if (match) {
      const indent = match[1];
      return indent.includes('\t') ? 4 : indent.length; // assume tab = 4 spaces
    }
  }
}
