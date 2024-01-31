import {
  apply,
  applyTemplates,
  chain,
  filter,
  mergeWith,
  move,
  noop,
  Rule,
  SchematicContext,
  SchematicsException,
  Tree,
  url
} from '@angular-devkit/schematics';
import { readWorkspace } from '@schematics/angular/utility';
import inquirer, { ListQuestion, InputQuestion } from 'inquirer';

import { getDefaultPath, parseName, strings } from '@criticalmanufacturing/schematics-devkit';
import { Schema } from './schema';
import { MetadataProperty, updateMetadata } from '../utility/metadata';
import { updateLibraryAPI } from '../utility/update-library-api';

function getMetadataActions(project: string, entityTypeName: string) {
  return `\
{
    id: '${strings.classify(entityTypeName)}.Create',
    mode: ActionMode.ModalPage,
    loadComponent: () => import(
        /* webpackExports: "WizardCreateEdit${strings.classify(entityTypeName)}Component" */
        '${project}').then(m => m.WizardCreateEdit${strings.classify(entityTypeName)}Component),
    context: {
        editMode: 1 // mode: EditMode.Create
    }
},
{
    id: '${strings.classify(entityTypeName)}.Edit',
    mode: ActionMode.ModalPage,
    loadComponent: () => import(
        /* webpackExports: "WizardCreateEdit${strings.classify(entityTypeName)}Component" */
        '${project}').then(m => m.WizardCreateEdit${strings.classify(entityTypeName)}Component),
    context: {
        editMode: 3 // mode: EditMode.Edit
    }
}`;
}

export default function (_options: Schema): Rule {
  return async (tree: Tree, _context: SchematicContext) => {
    if (!_options.namespace) {
      const question: ListQuestion = {
        type: 'list',
        name: 'namespace',
        message: 'What is the business objects namespace of the entity type?',
        choices: ['Foundation', 'Navigo', 'Other (specify)']
      };

      _options.namespace = (await inquirer.prompt([question])).namespace;

      if (_options.namespace!.startsWith('Other')) {
        const question: InputQuestion = {
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

    const workspace = await readWorkspace(tree);
    const project = workspace.projects.get(_options.project);

    if (!project) {
      throw new SchematicsException(`Project "${_options.project}" does not exist.`);
    }

    if (_options.path === undefined) {
      _options.path = getDefaultPath(project);
    }

    const parsedPath = parseName(_options.path, _options.name);
    _options.name = parsedPath.name;
    _options.path = parsedPath.path;

    const skipStyleFile = _options.style === 'none';

    const templateSource = apply(url('./files'), [
      skipStyleFile ? filter((path) => !path.endsWith('.__style__.template')) : noop(),
      applyTemplates({
        ...strings,
        ..._options
      }),
      move(parsedPath.path)
    ]);

    const metadataOptions = {
      identifier: MetadataProperty.Action,
      imports: { ActionMode: 'cmf-core' },
      toInsert: getMetadataActions(_options.project, _options.name)
    };

    return chain([
      mergeWith(templateSource),
      updateLibraryAPI(project),
      updateMetadata(project, metadataOptions)
    ]);
  };
}
