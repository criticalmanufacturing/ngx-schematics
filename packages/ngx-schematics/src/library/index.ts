import { basename, join, JsonArray, JsonObject, normalize } from '@angular-devkit/core';
import {
  apply,
  applyTemplates,
  chain,
  externalSchematic,
  mergeWith,
  move,
  noop,
  Rule,
  Tree,
  url
} from '@angular-devkit/schematics';
import { readWorkspace } from '@schematics/angular/utility';

import {
  createSourceFile,
  strings,
  relativeToRoot,
  getDefaultApplicationProject
} from '@criticalmanufacturing/schematics-devkit';
import { updateTsConfig } from '@criticalmanufacturing/schematics-devkit/rules';
import { Schema } from './schema';
import { addSymbolToNgModuleMetadata, getAppModulePath } from '../utility/ng-module';

function updateAppModule(options: { packageName: string; namePrefix: string }) {
  return async (tree: Tree) => {
    const project = await getDefaultApplicationProject(tree);

    if (!project) {
      return;
    }

    const modulePath = await getAppModulePath(tree, project);

    if (!modulePath) {
      return;
    }

    const source = createSourceFile(tree, modulePath);

    if (!source) {
      return;
    }

    addSymbolToNgModuleMetadata(
      source,
      'imports',
      `${strings.classify(options.namePrefix)}MetadataModule`,
      options.packageName,
      'CoreModule'
    );

    tree.overwrite(modulePath, source.getFullText());
  };
}

function createMetadataSubEntry(options: { name: string; skipTsConfig?: boolean }) {
  return async (host: Tree) => {
    const workspace = await readWorkspace(host);
    const project = workspace.projects.get(options.name);

    if (!project) {
      return;
    }

    const packageName = `${options.name}/metadata`;
    const folderName = basename(normalize(project!.root));
    const distRoot = `dist/${folderName}/metadata`;
    const namePrefix = options.name.replace(/^cmf-/, '');

    const templateSource = apply(url('./files'), [
      applyTemplates({
        ...strings,
        fullName: options.name,
        name: namePrefix,
        entryFile: 'public-api',
        relativePathToWorkspaceRoot: relativeToRoot(join(normalize(project.root), 'metadata')),
        distRoot: join(basename(normalize(project!.root)), 'metadata')
      }),
      move(join(normalize(project.root), 'metadata'))
    ]);

    return chain([
      mergeWith(templateSource),
      options.skipTsConfig
        ? noop()
        : updateTsConfig([[['compilerOptions', 'paths', packageName], [distRoot]]]),
      updateAppModule({ packageName, namePrefix })
    ]);
  };
}

export default function (_options: Schema): Rule {
  return async (tree: Tree) => {
    if (!_options.prefix) {
      const folderName = _options.name.startsWith('@') ? _options.name.substring(1) : _options.name;

      if (/[A-Z]/.test(folderName)) {
        _options.prefix = strings.dasherize(folderName);
      }
    }

    const workspace = await readWorkspace(tree);

    const lint = (
      (workspace.extensions.cli as JsonObject)?.schematicCollections as JsonArray
    )?.includes('@angular-eslint/schematics');

    const skipMetadata = _options.skipMetadata;
    delete _options.skipMetadata;

    return chain([
      externalSchematic(lint ? '@angular-eslint/schematics' : '@schematics/angular', 'library', {
        ..._options
      }),
      !skipMetadata ? createMetadataSubEntry({ ..._options }) : noop()
    ]);
  };
}
