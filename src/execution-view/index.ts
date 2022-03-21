import { strings } from '@angular-devkit/core';
import { apply, applyTemplates, chain, mergeWith, move, Rule, SchematicContext, SchematicsException, Tree, url } from '@angular-devkit/schematics';
import { parseName } from '@schematics/angular/utility/parse-name';
import { buildDefaultPath, getWorkspace } from '@schematics/angular/utility/workspace';
import * as inquirer from 'inquirer';
import { MetadataProperty } from '../utility/metadata';
import { updateMetadata, updatePublicAPI } from '../utility/rule';
import { nameify } from '../utility/string';

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

    if (!_options.name) {
      throw new SchematicsException(`Action name is required`);
    }

    if (!_options.entityType) {
      throw new SchematicsException(`Entity Type name is required`);
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

    const metadataOptions = {
      identifier: MetadataProperty.Action,
      imports: { 'ActionMode': 'cmf-core' },
      toInsert: `\
{
  id: '${strings.classify(_options.entityType)}.${strings.classify(_options.name).replace(strings.classify(_options.entityType), '')}',
  loadComponent: () => import(
    /* webpackExports: "Wizard${strings.classify(_options.name)}Component" */
    '${_options.project}').then(m => m.Wizard${strings.classify(_options.name)}Component),
  mode: ActionMode.ModalPage
}`
    };

    return chain([
      mergeWith(templateSource),
      updatePublicAPI(project, `Wizard ${nameify(_options.name)}`),
      updateMetadata(project, metadataOptions)
    ]);
  }
}