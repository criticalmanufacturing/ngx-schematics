import { Rule, Tree } from '@angular-devkit/schematics';
import { ProjectDefinition } from '@schematics/angular/utility';
import { ObjectLiteralExpression, SyntaxKind } from 'ts-morph';
import {
  createSourceFile,
  updateObjectArrayProperty,
  getFilePathFromEntryPoint
} from '@criticalmanufacturing/schematics-devkit';

/**
 * Library Metadata Info
 */
export interface IoTLibraryInfo {
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
 * Updates the package metadata with the desired information
 */
export function updateLibraryMetadata(project: ProjectDefinition, options: IoTLibraryInfo): Rule {
  return async (tree: Tree) => {
    const metadataPath = getFilePathFromEntryPoint(tree, project, 'metadata', (m) =>
      m.endsWith('/metadata')
    );

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
        (typeNode && typeNode.getText().endsWith('ConnectIoTPackageMetadata')) ||
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
