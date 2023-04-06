import { Rule, SchematicsException, Tree } from '@angular-devkit/schematics';
import { ProjectDefinition, readWorkspace } from '@schematics/angular/utility';
import { ObjectLiteralExpression, SyntaxKind } from 'ts-morph';
import { createSourceFile, insertExport } from './ast';
import { updateObjectArrayProperty } from './metadata';
import { getFilePathFromEntryPoint } from './project';
import { ProjectType, buildRelativePath } from './workspace';
import {
  Path,
  dirname,
  extname,
  join,
  normalize,
  strings
} from '@angular-devkit/core';
import { JSONFile } from './json';

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

export function updatePublicAPI(options: {
  project: string;
  converters: { name: string; path: string }[];
  tasks: { name: string; path: string }[];
}): Rule {
  return async (tree: Tree) => {
    const workspace = await readWorkspace(tree);
    const project = workspace.projects.get(options.project);

    if (!project) {
      throw new SchematicsException(
        `Project "${options.project}" does not exist.`
      );
    }

    if (
      project.extensions['projectType'] !== ProjectType.Library ||
      !tree.exists(join(normalize(project.root), 'ng-package.json'))
    ) {
      return;
    }

    const json = new JSONFile(
      tree,
      join(normalize(project.root), 'ng-package.json')
    );
    const entryFile = json.get(['lib', 'entryFile']) as string | null;

    if (!entryFile) {
      return;
    }

    const entryDir = join(
      tree.root.path,
      dirname(join(normalize(project.root), entryFile))
    );

    const designerEntryFile = createSourceFile(
      tree,
      join(normalize(project.root), entryFile)
    );

    const runtimeEntryFile = createSourceFile(
      tree,
      join(
        normalize(project.root),
        dirname(normalize(entryFile)),
        'public-api-runtime.ts'
      )
    );

    const converters: {
      name: string;
      converter: Path;
      designer: Path;
    }[] = [];

    options.converters.forEach(({ name, path }) => {
      const dasherizedName = strings.dasherize(name);

      converters.push({
        name: strings.classify(name),
        converter: join(
          normalize(path),
          `${dasherizedName}/${dasherizedName}.converter.ts`
        ),
        designer: join(
          normalize(path),
          `${dasherizedName}/${dasherizedName}.converter-designer.ts`
        )
      });
    });

    converters.forEach(({ name, converter, designer }) => {
      if (runtimeEntryFile) {
        insertExport(
          runtimeEntryFile,
          `${name}Converter`,
          buildRelativePath(entryDir, converter).replace(
            extname(converter),
            ''
          ),
          false,
          `\n// ${name}`
        );
      }

      if (designerEntryFile) {
        insertExport(
          designerEntryFile,
          `${name}Converter`,
          buildRelativePath(entryDir, converter).replace(
            extname(converter),
            ''
          ),
          false,
          `\n// ${name}`
        );

        insertExport(
          designerEntryFile,
          `${name}Designer`,
          buildRelativePath(entryDir, designer).replace(extname(designer), '')
        );
      }
    });

    const tasks: {
      name: string;
      module: Path;
      designer: Path;
      settings: Path;
    }[] = [];

    options.tasks.forEach(({ name, path }) => {
      const dasherizedName = strings.dasherize(name);

      tasks.push({
        name: strings.classify(name),
        module: join(
          normalize(path),
          `${dasherizedName}/${dasherizedName}.task-module.ts`
        ),
        designer: join(
          normalize(path),
          `${dasherizedName}/${dasherizedName}.task-designer.ts`
        ),
        settings: join(
          normalize(path),
          `${dasherizedName}/${dasherizedName}-settings.component.ts`
        )
      });
    });

    tasks.forEach(({ name, module, designer, settings }) => {
      if (runtimeEntryFile) {
        insertExport(
          runtimeEntryFile,
          `${name}Module`,
          buildRelativePath(entryDir, module).replace(extname(module), ''),
          false,
          `\n// ${name}`
        );
      }

      if (designerEntryFile) {
        insertExport(
          designerEntryFile,
          `${name}Module`,
          buildRelativePath(entryDir, module).replace(extname(module), ''),
          false,
          `\n// ${name}`
        );

        insertExport(
          designerEntryFile,
          `${name}Designer`,
          buildRelativePath(entryDir, designer).replace(extname(designer), '')
        );

        insertExport(
          designerEntryFile,
          `${name}Settings`,
          buildRelativePath(entryDir, settings).replace(extname(settings), '')
        );
      }
    });

    if (designerEntryFile) {
      tree.overwrite(
        join(normalize(project.root), entryFile),
        designerEntryFile.getFullText()
      );
    }

    if (runtimeEntryFile) {
      tree.overwrite(
        join(
          normalize(project.root),
          dirname(normalize(entryFile)),
          'public-api-runtime.ts'
        ),
        runtimeEntryFile.getFullText()
      );
    }
  };
}
