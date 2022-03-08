import { findNodes, insertAfterLastOccurrence } from "@schematics/angular/utility/ast-utils";
import { Change } from "@schematics/angular/utility/change";
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
