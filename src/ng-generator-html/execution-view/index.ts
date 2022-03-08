import { join, normalize, strings } from '@angular-devkit/core';
import { ProjectDefinition } from '@angular-devkit/core/src/workspace';
import { apply, applyTemplates, chain, mergeWith, move, Rule, SchematicContext, SchematicsException, Tree, url } from '@angular-devkit/schematics';
import { applyToUpdateRecorder } from '@schematics/angular/utility/change';
import { JSONFile } from '@schematics/angular/utility/json-file';
import { parseName } from '@schematics/angular/utility/parse-name';
import { buildDefaultPath, getWorkspace } from '@schematics/angular/utility/workspace';
import * as inquirer from 'inquirer';
import { findMetadataFile, insertMetadata } from '../utility/metadata-util';
import { updatePublicAPI } from '../utility/schematics';
import { nameify } from '../utility/string-util';

function updateMetadata(project: ProjectDefinition, projectName: string, actionName: string, entityType: string,): Rule {
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

    const recorder = tree.beginUpdate(metadataPath);
    applyToUpdateRecorder(recorder, insertMetadata(
      metadataContent,
      metadataPath,
      {
        'Action': 'cmf-core',
        'ActionMode': 'cmf-core'
      },
      'actions',
      'Action[]',
      'Actions',
      `\
{
  id: '${strings.classify(entityType)}.${strings.classify(actionName).replace(strings.classify(entityType), '')}',
  loadComponent: () => import(
    /* webpackExports: "Wizard${strings.classify(actionName)}Component" */
    '${projectName}').then(m => m.Wizard${strings.classify(actionName)}Component),
  mode: ActionMode.ModalPage
}`
    ));
    tree.commitUpdate(recorder);
  };
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

    const workspace = await getWorkspace(tree);
    const project = workspace.projects.get(_options.project as string);

    if (!project) {
      throw new SchematicsException(`Project "${_options.project}" does not exist.`);
    }

    if (_options.path === undefined) {
      _options.path = buildDefaultPath(project);
    }

    if (!_options.namespace) {
      throw new SchematicsException(`Entity Type mamespace is required`);
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
      move(parsedPath.path)
    ]);

    return chain([
      mergeWith(templateSource),
      updatePublicAPI(project, `Wizard ${nameify(_options.name)}`),
      updateMetadata(project, _options.project, _options.name, _options.entityType)
    ]);
  }
}