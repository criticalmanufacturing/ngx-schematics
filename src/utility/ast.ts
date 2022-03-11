import { tags } from "@angular-devkit/core";
import { findNodes, getDecoratorMetadata, getMetadataField, insertAfterLastOccurrence, insertImport } from "@schematics/angular/utility/ast-utils";
import { Change, InsertChange } from "@schematics/angular/utility/change";
import ts = require("typescript");

/**
 * Inserts an Export Declaration in a file
 * @param source Source File
 * @param fileToEdit File Path to Edit
 * @param symbolName Export symbol
 * @param fileName Export file name
 * @param description Export Description
 * @param isDefault Is Default Export
 * @returns 
 */
export function insertExport(
  source: ts.SourceFile,
  fileToEdit: string,
  symbolName: string,
  fileName: string,
  description?: string,
  isDefault = false
): Change {
  const rootNode = source;
  const allExports = findNodes(rootNode, ts.SyntaxKind.ExportDeclaration);
  const useStrict = findNodes(rootNode, ts.isStringLiteral).filter((n) => n.text === 'use strict');
  let fallbackPos = 0;
  if (useStrict.length > 0) {
    fallbackPos = useStrict[0].end;
  }

  const open = isDefault ? '' : '{ ';
  const close = isDefault ? '' : ' }';
  // if there are no imports or 'use strict' statement, insert import at beginning of file
  const insertAtBeginning = allExports.length === 0;
  const separator = insertAtBeginning ? '' : ';\n';
  const toInsert = `${separator}${description ? '\n// ' + description + '\n' : ''}`
    + `export ${open}${symbolName}${close} from '${fileName}'${insertAtBeginning ? ';\n' : ''}`;

  return insertAfterLastOccurrence(
    allExports,
    toInsert,
    fileToEdit,
    fallbackPos,
    ts.SyntaxKind.StringLiteral,
  );
}

export function addSymbolToNgModuleMetadata(
  source: ts.SourceFile,
  ngModulePath: string,
  metadataField: string,
  symbolName: string,
  importPath: string | null = null,
  insertBefore: string | null = null
): Change[] {
  const nodes = getDecoratorMetadata(source, 'NgModule', '@angular/core');
  let node: any = nodes[0];

  // Find the decorator declaration.
  if (!node) {
    return [];
  }

  // Get all the children property assignment of object literals.
  const matchingProperties = getMetadataField(node as ts.ObjectLiteralExpression, metadataField);

  if (matchingProperties.length == 0) {
    // We haven't found the field in the metadata declaration. Insert a new field.
    const expr = node as ts.ObjectLiteralExpression;
    let position: number;
    let toInsert: string;
    if (expr.properties.length == 0) {
      position = expr.getEnd() - 1;
      toInsert = `\n  ${metadataField}: [\n${tags.indentBy(4)`${symbolName}`}\n  ]\n`;
    } else {
      node = expr.properties[expr.properties.length - 1];
      position = node.getEnd();
      // Get the indentation of the last element, if any.
      const text = node.getFullText(source);
      const matches = text.match(/^(\r?\n)(\s*)/);
      if (matches) {
        toInsert =
          `,${matches[0]}${metadataField}: [${matches[1]}` +
          `${tags.indentBy(matches[2].length + 2)`${symbolName}`}${matches[0]}]`;
      } else {
        toInsert = `, ${metadataField}: [${symbolName}]`;
      }
    }
    if (importPath !== null) {
      return [
        new InsertChange(ngModulePath, position, toInsert),
        insertImport(source, ngModulePath, symbolName.replace(/\..*$/, ''), importPath),
      ];
    } else {
      return [new InsertChange(ngModulePath, position, toInsert)];
    }
  }
  const assignment = matchingProperties[0] as ts.PropertyAssignment;

  if (assignment.initializer.kind !== ts.SyntaxKind.ArrayLiteralExpression) {
    return [];
  }

  const arrLiteral = assignment.initializer as ts.ArrayLiteralExpression;
  if (arrLiteral.elements.length == 0) {
    // Forward the property.
    node = arrLiteral;
  } else {
    node = arrLiteral.elements;
  }
 
  if (Array.isArray(node)) {
    const nodeArray = (node as {}) as Array<ts.Node>;
    const symbolsArray = nodeArray.map((node) => tags.oneLine`${node.getText()}`);
    if (symbolsArray.includes(tags.oneLine`${symbolName}`)) {
      return [];
    }

    const beforeNodeIndex = arrLiteral.elements.findIndex((node) => node.getText() === insertBefore);
    node = beforeNodeIndex > 0 ? node[beforeNodeIndex - 1] : node[node.length - 1];
  }

  let toInsert: string;
  let position = node.getEnd();
  if (node.kind == ts.SyntaxKind.ArrayLiteralExpression) {
    // We found the field but it's empty. Insert it just before the `]`.
    position--;
    toInsert = `\n${tags.indentBy(4)`${symbolName}`}\n  `;
  } else {
    // Get the indentation of the last element, if any.
    const text = node.getFullText(source);
    const matches = text.match(/^(\r?\n)(\s*)/);
    if (matches) {
      toInsert = `,${matches[1]}${tags.indentBy(matches[2].length)`${symbolName}`}`;
    } else {
      toInsert = `, ${symbolName}`;
    }
  }
  if (importPath !== null) {
    return [
      new InsertChange(ngModulePath, position, toInsert),
      insertImport(source, ngModulePath, symbolName.replace(/\..*$/, ''), importPath),
    ];
  }

  return [new InsertChange(ngModulePath, position, toInsert)];
}