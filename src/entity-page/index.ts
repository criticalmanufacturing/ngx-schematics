import { join, normalize, strings } from '@angular-devkit/core';
import { apply, applyTemplates, chain, mergeWith, move, Rule, SchematicContext, SchematicsException, Tree, url } from '@angular-devkit/schematics';
import { buildDefaultPath, getWorkspace } from '@schematics/angular/utility/workspace';
import { parseName } from '@schematics/angular/utility/parse-name';
import * as inquirer from 'inquirer';
import { nameify } from '../utility/string';
import { updateMetadata, updatePublicAPI } from '../utility/rule';
import { findMetadataFile, insertRoutesMetadata, MetadataProperty } from '../utility/metadata';
import { applyToUpdateRecorder } from '@schematics/angular/utility/change';
import { JSONFile } from '@schematics/angular/utility/json-file';
import { ProjectDefinition } from '@angular-devkit/core/src/workspace';

function updateRoutesMetadata(project: ProjectDefinition, options: any) {
  return async (tree: Tree) => {
    if (!tree.exists(join(normalize(project.root), 'metadata', 'ng-package.json'))) {
      return;
    }

    const json = new JSONFile(tree, join(normalize(project.root), 'metadata', 'ng-package.json'));
    const entryFile = json.get(['lib', 'entryFile']) as string | null;

    if (!entryFile) {
      return;
    }

    const content = tree.get(join(normalize(project.root), 'metadata', entryFile))?.content.toString('utf-8');

    if (!content) {
      return;
    }

    const metadataPath = findMetadataFile(content, entryFile, project.root);

    if (!metadataPath) {
      return;
    }

    const metadataContent = tree.get(metadataPath)?.content.toString('utf-8');

    if (!metadataContent) {
      return;
    }

    const toInsert = `\
{
  path: 'Entity/${strings.classify(options.name)}/:id',
  loadChildren: () => import(
    /* webpackExports: "Page${strings.classify(options.name)}RoutingModule" */
    '${strings.dasherize(options.project)}').then(m => m.Page${strings.classify(options.name)}RoutingModule)
}
`;

    const changes = insertRoutesMetadata(metadataContent, metadataPath, {}, toInsert);

    if (!changes) {
      return;
    }

    const recorder = tree.beginUpdate(metadataPath);
    applyToUpdateRecorder(recorder, changes);
    tree.commitUpdate(recorder);
  }
}

export default function (_options: any): Rule {
  return async (tree: Tree, _context: SchematicContext) => {
    if (!_options.namespace) {
      const question: inquirer.ListQuestion = {
        type: 'list',
        name: 'namespace',
        message: 'What is the business objects namespace of the entity type?',
        choices: ['Foundation', 'Navigo', 'Other (specify)']
      };

      _options.namespace = (await inquirer.prompt([question])).namespace;

      if ((_options.namespace as string).startsWith('Other')) {
        const question: inquirer.InputQuestion = {
          type: 'input',
          name: 'namespace',
          message: 'Namespace'
        };

        _options.namespace = (await inquirer.prompt([question])).namespace;
      }
    }

    if (!_options.name) {
      throw new SchematicsException(`Entity Type name is required`);
    }

    if (!_options.namespace) {
      throw new SchematicsException(`Entity Type mamespace is required`);
    }

    const workspace = await getWorkspace(tree);
    const project = workspace.projects.get(_options.project as string);

    if (!project) {
      throw new SchematicsException(`Project "${_options.project}" does not exist.`);
    }

    if (_options.path === undefined) {
      _options.path = buildDefaultPath(project);
    }

    const parsedPath = parseName(_options.path as string, _options.name);
    _options.name = parsedPath.name;
    _options.path = parsedPath.path;

    const templateSource = apply(url('./files'), [
      applyTemplates({
        ...strings,
        ..._options,
        nameify,
        project: project?.prefix ?? _options.project
      }),
      move(parsedPath.path),
    ]);

    const metadataOptions = {
      identifier: MetadataProperty.EntityType,
      imports: {},
      toInsert: `\
{
  name: '${strings.classify(_options.name)}'
}`
    };

    return chain([
      mergeWith(templateSource),
      updatePublicAPI(project, `Page ${nameify(_options.name)}`),
      updateMetadata(project, metadataOptions),
      updateRoutesMetadata(project, _options)
    ]);
  }
}
