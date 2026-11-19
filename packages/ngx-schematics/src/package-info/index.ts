import { join, normalize, dirname } from '@angular-devkit/core';
import { chain, Rule, SchematicsException, Tree } from '@angular-devkit/schematics';
import { readWorkspace, ProjectDefinition } from '@schematics/angular/utility';
import {
  createSourceFile,
  getEntryFilePath,
  ProjectType
} from '@criticalmanufacturing/schematics-devkit';

import { setPackageInfoMetadata, PackageInfo, getMetadataFilePath } from '../utility/metadata.js';
import { Schema } from './schema.js';

/**
 * Lists TypeScript files re-exported directly or indirectly by the primary library entry point.
 * @param host Schematic tree containing the library sources.
 * @param entryFile Path to the primary entry point.
 */
function getAllFiles(host: Tree, entryFile: string): string[] {
  const filesToSearch = [entryFile];
  const filesFound: string[] = [];

  while (filesToSearch.length > 0) {
    const file = filesToSearch.pop()!;
    const sourceFile = createSourceFile(host, file);

    if (!sourceFile) {
      continue;
    }

    sourceFile.getExportDeclarations().forEach((node) => {
      const modulePath = node.getModuleSpecifierValue();

      if (!modulePath) {
        return;
      }

      const path = join(dirname(normalize(file)), modulePath + '.ts');

      if (!host.exists(path)) {
        return;
      }

      if (!filesFound.includes(path)) {
        filesFound.push(path);

        if (!filesToSearch.includes(path)) {
          filesToSearch.push(path);
        }
      }
    });
  }

  return filesFound;
}

function fillMetadataPackageInfo(project: ProjectDefinition, options: Required<PackageInfo>): Rule {
  return (tree: Tree) => {
    const metadataPath = getMetadataFilePath(tree, project);

    if (!metadataPath) {
      return;
    }
    const source = createSourceFile(tree, metadataPath);

    if (!source) {
      return;
    }

    setPackageInfoMetadata(source, options);
    tree.overwrite(metadataPath, source.getFullText());
  };
}

/**
 * Regenerates library package metadata from the classes exposed by the primary entry point.
 * @param _options Options identifying the library project to inspect.
 */
export default function (_options: Schema): Rule {
  return async (tree: Tree) => {
    const workspace = await readWorkspace(tree);

    if (!_options.project) {
      return;
    }

    const project = workspace.projects.get(_options.project);

    if (!project) {
      throw new SchematicsException(`Project "${_options.project}" does not exist.`);
    }

    if (project.extensions['projectType'] !== ProjectType.Library) {
      return;
    }

    const entryFile = getEntryFilePath(tree, project, '');
    if (!entryFile || !tree.exists(entryFile)) {
      throw new SchematicsException(`Project "${_options.project}" has no primary entry point.`);
    }

    const packageInfo: Required<PackageInfo> = {
      package: _options.project,
      widgets: [],
      converters: [],
      dataSources: [],
      components: []
    };

    getAllFiles(tree, entryFile).forEach((file) => {
      const source = createSourceFile(tree, file);

      if (!source) {
        return;
      }

      source?.getClasses().forEach((node) => {
        const className = node.getName();

        if (node.isAbstract() || !className) {
          return;
        }

        if (node.getDecorator('Widget')) {
          packageInfo.widgets.push(className);
        } else if (node.getDecorator('DataSource')) {
          packageInfo.dataSources.push(className);
        } else if (node.getDecorator('Converter')) {
          packageInfo.converters.push(className);
        } else if (node.getDecorator('Component')) {
          packageInfo.components.push(className);
        }
      });
    });

    return chain([fillMetadataPackageInfo(project, packageInfo)]);
  };
}
