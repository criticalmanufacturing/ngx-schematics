import { Rule, Tree } from '@angular-devkit/schematics';
import { ProjectDefinition } from '@schematics/angular/utility';
import { ObjectLiteralExpression, SyntaxKind } from 'ts-morph';
import { createSourceFile } from './ast';
import { updateObjectArrayProperty } from './metadata';
import { getFilePathFromEntryPoint } from './project';

export type IoTValueType =
  | 'Any'
  | 'String'
  | 'Integer'
  | 'Long'
  | 'Decimal'
  | 'Boolean'
  | 'Date'
  | 'Object'
  | 'Buffer'
  | 'Enum';

export type ValueType =
  | 'any'
  | 'string'
  | 'number'
  | 'boolean'
  | 'object'
  | 'Buffer';

export interface IoTPackageInfo {
  /**
   * Tasks Metadata
   */
  tasks?: string[];
  /**
   * Converters Metadata
   */
  converters?: string[];
}

/**
 * Return the TypeScript corresponding type for the IoT data type
 * @param type IoT data type to translate
 */
export function toValueType(type: IoTValueType): string {
  switch (type) {
    case 'String':
      return 'string';
    case 'Decimal':
    case 'Long':
    case 'Integer':
      return 'number';
    case 'Object':
      return 'object';
    case 'Buffer':
      return 'Buffer';
    case 'Boolean':
      return 'boolean';
    case 'Date':
      return 'Date';
  }

  return 'any';
}

/**
 * Return the converter type name corresponding for the IoT data type
 * @param type IoT data type to translate
 */
export function toConverterType(type: IoTValueType): string {
  if (type === 'Any') {
    return 'undefined';
  }

  return 'Converter.ConverterValueType.' + type;
}

function getMetadataFilePath(tree: Tree, project: ProjectDefinition) {
  return getFilePathFromEntryPoint(tree, project, 'metadata', (m) =>
    m.endsWith('/metadata')
  );
}

export function updatePackageMetadata(
  project: ProjectDefinition,
  options: IoTPackageInfo
): Rule {
  return async (tree: Tree) => {
    const metadataPath = getMetadataFilePath(tree, project);

    if (!metadataPath) {
      return;
    }

    const source = createSourceFile(tree, metadataPath);

    if (!source) {
      return;
    }

    let metadataObject: ObjectLiteralExpression | undefined;

    for (const statement of source.getVariableStatements()) {
      const variableDeclaration = statement.getFirstDescendantByKind(
        SyntaxKind.VariableDeclaration
      );

      if (!variableDeclaration) {
        continue;
      }

      const typeNode = variableDeclaration.getTypeNode();

      if (
        (typeNode &&
          typeNode.getText().endsWith('ConnectIoTPackageMetadata')) ||
        variableDeclaration.getName() === 'Metadata'
      ) {
        metadataObject = variableDeclaration.getInitializerIfKind(
          SyntaxKind.ObjectLiteralExpression
        );
      }
    }

    if (!metadataObject) {
      return;
    }

    options.tasks ??= [];
    options.converters ??= [];

    updateObjectArrayProperty(metadataObject, 'tasks', options.tasks);
    updateObjectArrayProperty(metadataObject, 'converters', options.converters);

    tree.overwrite(metadataPath, source.getFullText());
  };
}
