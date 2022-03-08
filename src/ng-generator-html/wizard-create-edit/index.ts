import { strings } from '@angular-devkit/core';
import { apply, applyTemplates, chain, mergeWith, move, Rule, SchematicContext, SchematicsException, Tree, url } from '@angular-devkit/schematics';
import { buildDefaultPath, getWorkspace } from '@schematics/angular/utility/workspace';
import { parseName } from '@schematics/angular/utility/parse-name';
import * as inquirer from 'inquirer';
import { nameify } from '../utility/string';
import { updateMetadata, updatePublicAPI } from '../utility/rule';
import { MetadataProperty } from '../utility/metadata';

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
      identifier: MetadataProperty.Action,
      imports: { 'ActionMode': 'cmf-core' },
      toInsert: `\
{
  id: '${strings.classify(_options.name)}.Create',
  mode: ActionMode.ModalPage,
  loadComponent: () => import(
    /* webpackExports: "WizardCreateEdit${strings.classify(_options.name)}Component" */
    '${_options.project}').then(m => m.WizardCreateEdit${strings.classify(_options.name)})Component,
  context: {
    editMode: 1 // mode: EditMode.Create
  }
},
{
  id: '${strings.classify(_options.name)}.Edit',
  mode: ActionMode.ModalPage,
  loadComponent: () => import(
    /* webpackExports: "WizardCreateEdit${strings.classify(_options.name)}Component" */
    '${_options.project}').then(m => m.WizardCreateEdit${strings.classify(_options.name)}Component),
  context: {
    editMode: 3 // mode: EditMode.Edit
  }
}`
    };

    return chain([
      mergeWith(templateSource),
      updatePublicAPI(project, `Wizard Create Edit ${nameify(_options.name)}`),
      updateMetadata(project, metadataOptions)
    ]);
  }
}
