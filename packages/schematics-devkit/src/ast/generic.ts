import { dirname, isAbsolute, join, normalize, relative } from '@angular-devkit/core';
import { Tree } from '@angular-devkit/schematics';
import {
  ArrayLiteralExpression,
  ClassDeclaration,
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
 * Inserts an import Declaration in a source file.
 * @param source Source File
 * @param symbolName Import symbol
 * @param module Import module specifier
 * @param isDefault Is default import
 * @param leadingTrivia Leading trivia to add before the import
 * @param trailingTrivia Trailing trivia to add after the import
 */
export function insertImport(
  source: SourceFile,
  symbolName: string,
  module: string,
  isDefault = false,
  leadingTrivia = '\n',
  trailingTrivia = '\n'
): void {
  insertImports(source, [symbolName], module, isDefault);
}

/**
 * Inserts import declarations in a source file.
 *
 * @param source - The SourceFile to add imports to.
 * @param imports - An array of import symbols to add.
 * @param module - The module specifier for the imports.
 * @param isDefault - Whether the import is a default import. Defaults to false.
 */
export function insertImports(
  source: SourceFile,
  imports: string[],
  module: string,
  isDefault = false
): void {
  const allImports = source.getImportDeclarations();
  const importNode = allImports.find((node) => node.getModuleSpecifierValue() === module);

  if (isDefault) {
    // If it's a default import and there's no existing namespace import, add a new import declaration
    if (importNode?.getNamespaceImport()) {
      return;
    }

    source.addImportDeclaration({ moduleSpecifier: module, defaultImport: '' });
  } else if (importNode) {
    // If there's an existing import for this module, add new named imports
    const addNewLine = importNode.getNamedImports()[0]?.getFullText().includes('\n') === true;
    const namedImports = importNode.getNamedImports();
    const importsToAdd = imports
      .filter((imp) => namedImports.every((node) => node.getName() !== imp))
      .map((x) => (addNewLine ? `\n${x}` : x));

    importNode.addNamedImports(importsToAdd);
    importNode.formatText({ indentSize: getIndentSize(source) });
  } else {
    // If there's no existing import for this module, add a new import declaration
    source.addImportDeclaration({ moduleSpecifier: module, namedImports: imports });
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
 * Retrieves the import specifier for a given node.
 *
 * @param identifier - The Node object to search for in the import declarations.
 * @returns The ImportSpecifier for the given node, or undefined if not found.
 */
export function getImportSpecifier(identifier: Node): ImportSpecifier | undefined;
/**
 * Retrieves the import specifier for a given symbol name in a source file.
 * @param node The symbol name to search for.
 * @param sourceFile The source file to search in.
 * @returns The ImportSpecifier for the given symbol, or undefined if not found.
 */
export function getImportSpecifier(
  identifier: string,
  sourceFile: SourceFile
): ImportSpecifier | undefined;
/**
 * Retrieves the import specifier for a given node or symbol name in a source file.
 *
 * @param node - The Node object or string representing the symbol name to search for.
 * @param sourceFile - Optional. The SourceFile to search in when `node` is a string.
 * @returns The ImportSpecifier for the given node or symbol, or undefined if not found.
 */
export function getImportSpecifier(
  identifier: Node | string,
  sourceFile?: SourceFile
): ImportSpecifier | undefined {
  const source = typeof identifier === 'string' ? sourceFile : identifier.getSourceFile();
  const text = typeof identifier === 'string' ? identifier : identifier.getText();

  if (!source) {
    return;
  }

  return source
    .getImportDeclarations()
    .flatMap((impNode) => impNode.getNamedImports())
    .find((imp) => imp.getName() === text);
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
 * @param arrayLiteral the array literal node
 * @param toInsert the symbol to insert
 * @param before the symbol to insert before
 * @returns
 */
export function addSymbolToArrayLiteral(
  arrayLiteral: ArrayLiteralExpression,
  toInsert: string,
  before?: string
): void {
  if (arrayLiteral.getElements().some((elem) => elem.getText() === toInsert.trim())) {
    return;
  }

  let index = arrayLiteral.getElements().length;

  if (before) {
    const beforeIndex = arrayLiteral.getElements().findIndex((elem) => elem.getText() === before);

    if (beforeIndex >= 0) {
      index = beforeIndex;
    }
  }

  arrayLiteral.insertElement(index, toInsert);
}

/**
 * Removes a symbol from an array literal
 * @param arrayLiteral the array literal node
 * @param toInsert the symbol to remove
 * @returns
 */
export function removeSymbolFromArrayLiteral(
  arrayLiteral: ArrayLiteralExpression,
  toRemove: string
): void {
  const index = arrayLiteral.getElements().findIndex((elem) => elem.getText() === toRemove);

  if (index < 0) {
    return;
  }

  arrayLiteral.removeElement(index);
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

/**
 * Reads the component template for a given class declaration.
 *
 * @param classDec - The ClassDeclaration object representing the component class.
 * @param tree - The Tree object used to read file contents.
 * @param root - The root path, defaults to '/'.
 * @returns The component template as a string, or undefined if not found.
 */
export function readComponentTemplate(
  classDec: ClassDeclaration,
  tree: Tree,
  root = '/'
): string | undefined {
  const componentDec = classDec
    .getDecorator('Component')
    ?.getArguments()[0]
    .asKind(SyntaxKind.ObjectLiteralExpression);

  if (!componentDec) {
    return;
  }

  // Check for templateUrl property
  const templateUrlNode = componentDec
    .getProperty('templateUrl')
    ?.asKind(SyntaxKind.PropertyAssignment)
    ?.getInitializer();
  const templateUrl = (
    templateUrlNode?.asKind(SyntaxKind.StringLiteral) ??
    templateUrlNode?.asKind(SyntaxKind.NoSubstitutionTemplateLiteral)
  )?.getLiteralText();

  if (templateUrl) {
    // If templateUrl is found, read the template file
    const templatePath = relative(
      normalize(root),
      join(dirname(normalize(classDec.getSourceFile().getFilePath())), templateUrl)
    );

    if (tree.exists(templatePath)) {
      return tree.readText(templatePath);
    }

    return;
  }

  // If templateUrl is not found, check for inline template
  const templateNode = componentDec
    .getProperty('template')
    ?.asKind(SyntaxKind.PropertyAssignment)
    ?.getInitializer();
  return (
    templateNode?.asKind(SyntaxKind.StringLiteral) ??
    templateNode?.asKind(SyntaxKind.NoSubstitutionTemplateLiteral)
  )?.getLiteralText();
}
