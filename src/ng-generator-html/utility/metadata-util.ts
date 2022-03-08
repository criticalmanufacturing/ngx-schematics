import { dirname, join, normalize } from "@angular-devkit/core";
import { indentBy } from "@angular-devkit/core/src/utils/literals";
import { findNode, findNodes, getSourceNodes, insertAfterLastOccurrence, insertImport } from "@schematics/angular/utility/ast-utils";
import { InsertChange } from "@schematics/angular/utility/change";
import ts = require("typescript");

/**
 * Updates the space identation in a string
 * @param spacesToUse Spaces to use in the identation
 */
function updateSpaces(spacesToUse: number, initialSpaces: number = 2) {
  return (strings: TemplateStringsArray, ...substitutions: any[]) => {
    return String.raw(strings, ...substitutions).replace(/^([ \t]+)/gm, (_, match: string) => {
      const spaces = match.split('').reduce((res, char) => res += char === ' ' ? 1 : 2, 0)
      return `${' '.repeat(Math.floor(spaces / initialSpaces) * spacesToUse + spaces % 2)}`;
    });
  };
}

/**
 * Finds the metadata file path in the root given the public api
 * @param content File content to search the metadata on
 * @param fileName Metadata File Name
 */
export function findMetadataFile(content: string, fileName: string, root: string) {
  const source = ts.createSourceFile(fileName, content, ts.ScriptTarget.Latest, true);
  const exportNodes = findNodes(source, ts.SyntaxKind.ExportDeclaration);

  for (const node of exportNodes) {
    const importFiles = node.getChildren()
      .filter(ts.isLiteralExpression)
      .filter((n) => n.text.endsWith('metadata.service'));

    if (importFiles.length === 1) {
      return join(dirname(join(normalize(root), 'metadata', fileName)), importFiles[0].text) + '.ts';
    }
  }

  return null;
}

/**
 * Inserts content in the metadata file.
 * @param content Metadata File Content
 * @param filePath Metadata File Path
 * @param requiredImports Required Import of the content to insert
 * @param propertyIdentifier Identifier of the content
 * @param typeReference Type reference of the object to insert
 * @param description Property to insert description
 * @param toInsert Content to insert
 */
export function insertMetadata(
  content: string,
  filePath: string,
  requiredImports: Record<string, string>,
  propertyIdentifier: string,
  typeReference: string,
  description: string,
  toInsert: string
) {
  const source = ts.createSourceFile(filePath, content, ts.ScriptTarget.Latest, true);

  const metadataClassDeclaration = getSourceNodes(source)
    .filter(ts.isClassDeclaration)
    .filter(node => {
      if (!node.heritageClauses) {
        return false;
      }

      return node.heritageClauses.find((clause) =>
        clause.getChildAt(0).kind === ts.SyntaxKind.ExtendsKeyword
        && findNode(clause, ts.SyntaxKind.Identifier, 'PackageMetadata'));
    })[0];

  const allAccessors = findNodes(metadataClassDeclaration, ts.SyntaxKind.GetAccessor);

  const actions = allAccessors.find((accessor) =>
    accessor.getChildren().find(node => node.kind === ts.SyntaxKind.Identifier && node.getText() === propertyIdentifier));

  const contentNode = metadataClassDeclaration.getChildAt(metadataClassDeclaration.getChildren()
    .findIndex(node => node.kind === ts.SyntaxKind.OpenBraceToken) + 1);

  const spaces = contentNode.getFullText().match(/^(\r?\n)+(\s*)/)?.[2].length ?? 2;

  if (!actions) {
    const toInsertSpaced = updateSpaces(spaces)`
  
    /**
     * ${description}
     */
    public override get ${propertyIdentifier}(): ${typeReference} {
      return [
  ${indentBy(6)`${toInsert}`}
      ];
    }`;

    const fallbackPos = findNodes(contentNode, ts.SyntaxKind.Constructor, 1)[0]?.getEnd() ?? contentNode.getStart();
    return [
      ...Object.keys(requiredImports).map((key) => insertImport(source, filePath, key, requiredImports[key])),
      insertAfterLastOccurrence(allAccessors, toInsertSpaced, filePath, fallbackPos, ts.SyntaxKind.GetAccessor)
    ];
  }

  const returnStatement = findNodes(actions, ts.SyntaxKind.ReturnStatement, 1, true)[0];
  const array = findNodes(returnStatement, ts.SyntaxKind.ArrayLiteralExpression, 1, true)[0];
  const list = array.getChildAt(1);

  const lastChild = list.getChildAt(list.getChildCount() - 1);

  const toInsertSpaced = updateSpaces(spaces)`${lastChild && lastChild.kind !== ts.SyntaxKind.CommaToken ? ',' : ''}
  ${indentBy(6)`${toInsert}`}${lastChild ? '' : `\n    `}`;

  return [
    ...Object.keys(requiredImports).map((key) => insertImport(source, filePath, key, requiredImports[key])),
    new InsertChange(filePath, lastChild?.getEnd() ?? array.getEnd() - 1, toInsertSpaced)
  ];
}
