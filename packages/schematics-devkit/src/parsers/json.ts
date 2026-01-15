import { JsonValue } from '@angular-devkit/core';
import { Tree } from '@angular-devkit/schematics';
import {
  Node,
  ParseError,
  applyEdits,
  findNodeAtLocation,
  getNodeValue,
  modify,
  parseTree,
  printParseErrorCode
} from 'jsonc-parser';

export type InsertionIndex = (properties: string[]) => number;
export type JSONPath = (string | number)[];

export class JSONFile {
  content: string;

  constructor(
    private readonly host: Tree,
    private readonly path: string
  ) {
    this.content = this.host.readText(this.path);
  }

  private _jsonAst: Node | undefined;
  private get JsonAst(): Node | undefined {
    if (this._jsonAst) {
      return this._jsonAst;
    }

    const errors: ParseError[] = [];
    this._jsonAst = parseTree(this.content, errors, {
      allowTrailingComma: true
    });

    if (errors.length > 0) {
      throw new Error(
        `Failed to parse JSON: ${printParseErrorCode(errors[0].error)} at offset ${
          errors[0].offset
        }`
      );
    }

    return this._jsonAst;
  }

  get(jsonPath: JSONPath): JsonValue | undefined {
    const jsonAstNode = this.JsonAst;

    if (!jsonAstNode) {
      return;
    }

    if (jsonPath.length === 0) {
      return getNodeValue(jsonAstNode) as JsonValue;
    }

    const node = findNodeAtLocation(jsonAstNode, jsonPath);

    if (!node) {
      return;
    }

    return getNodeValue(node) as JsonValue;
  }

  modify(
    jsonPath: JSONPath,
    value: JsonValue | undefined,
    insertInOrder?: InsertionIndex | false
  ): void {
    let getInsertionIndex: InsertionIndex | undefined;
    if (insertInOrder === undefined) {
      const property = jsonPath.slice(-1)[0];
      getInsertionIndex = (properties) =>
        [...properties, property].sort().findIndex((p) => p === property);
    } else if (insertInOrder !== false) {
      getInsertionIndex = insertInOrder;
    }

    const edits = modify(this.content, jsonPath, value, {
      getInsertionIndex,
      formattingOptions: {
        insertSpaces: true,
        tabSize: 2
      }
    });

    this.content = applyEdits(this.content, edits);
    this.host.overwrite(this.path, this.content);
    this._jsonAst = undefined;
  }
}
