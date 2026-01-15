import {
  apply,
  applyTemplates,
  chain,
  filter,
  mergeWith,
  move,
  noop,
  Rule,
  SchematicsException,
  Tree,
  url
} from '@angular-devkit/schematics';
import { readWorkspace } from '@schematics/angular/utility';

import {
  promptNamespace,
  getDefaultPath,
  parseName,
  strings
} from '@criticalmanufacturing/schematics-devkit';
import { Schema } from './schema.js';
import { MetadataProperty, updateMetadata } from '../utility/metadata.js';
import { updateLibraryAPI } from '../utility/update-library-api.js';

function getMetadataActions(project: string, name: string) {
  return `
{
  id: '${strings.classify(name)}.Create',
  mode: ActionMode.ModalPage,
  loadComponent: async () =>
    (
      await import(
        /* webpackExports: "WizardCreateEdit${strings.classify(name)}Component" */
        '${project}'
      )
    ).WizardCreateEdit${strings.classify(name)}Component,
  context: {
    editMode: 1 // mode: EditMode.Create
  }
},
{
  id: '${strings.classify(name)}.Edit',
  mode: ActionMode.ModalPage,
  loadComponent: async () =>
    (
      await import(
        /* webpackExports: "WizardCreateEdit${strings.classify(name)}Component" */
        '${project}'
      )
    ).WizardCreateEdit${strings.classify(name)}Component,
  context: {
    editMode: 3 // mode: EditMode.Edit
  }
}
`;
}

export default function (_options: Schema): Rule {
  return async (tree: Tree) => {
    if (!_options.namespace) {
      _options.namespace = await promptNamespace();
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
