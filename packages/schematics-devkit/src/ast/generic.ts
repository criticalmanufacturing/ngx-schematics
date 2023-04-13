import { isAbsolute, normalize } from '@angular-devkit/core';
import { Tree } from '@angular-devkit/schematics';
import {
  ObjectLiteralExpression,
  Project,
  QuoteKind,
  SourceFile,
  StructureKind,
  SyntaxKind
} from 'ts-morph';

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

    importNode.addNamedImport(symbolName);
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

  array.addElements(
    elementsToAdd.map((e) => "'" + e + "'"),
    { useNewLines: true }
  );

  const loader = objectExpression.getProperty('loader');

  if (!loader) {
    return;
  }

  const loaderText = loader.getText();
  const exportsMatch = /webpackExports\s*:\s*\[([^\]]*?)(\s*\])/.exec(loaderText);

  if (exportsMatch) {
    const insertIndex = exportsMatch.index + exportsMatch[0].length - exportsMatch[2].length;
    const baseIndentation = loader.getIndentationText().length / loader.getIndentationLevel();
    const indentation = loader.getIndentationText() + ' '.repeat(baseIndentation * 2);
    loader.replaceWithText(
      loaderText.slice(0, insertIndex) + // ... webpackExports: [...
        (exportsMatch[1].trim().length > 0 ? ',' : '') +
        `\n${indentation}"${elementsToAdd.join(`",\n${indentation}"`)}"` +
        (exportsMatch[2].length === 1
          ? `\n${loader.getIndentationText() + ' '.repeat(baseIndentation)}`
          : '') +
        loaderText.slice(insertIndex, loaderText.length) // ] ...
    );
  }

  loader.formatText();
}
