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

export default function (_options: Schema): Rule {
  return async (tree: Tree, _context: SchematicContext) => {
    if (!_options.namespace) {
      const namespaceQuestion: ListQuestion = {
        type: 'list',
        name: 'namespace',
        message: 'What is the business objects namespace of the entity type?',
        choices: ['Foundation', 'Navigo', 'Other (specify)']
      };

      _options.namespace = (await inquirer.prompt([namespaceQuestion])).namespace;

      if (_options.namespace!.startsWith('Other')) {
        const namespaceQuestion: InputQuestion = {
          type: 'input',
          name: 'namespace',
          message: 'Namespace'
        };

        _options.namespace = (await inquirer.prompt([namespaceQuestion])).namespace;
      }
    }

    const workspace = await readWorkspace(tree);
    const project = workspace.projects.get(_options.project);

    if (!project) {
      throw new SchematicsException(`Project "${_options.project}" does not exist.`);
    }

    if (_options.path === undefined) {
      _options.path = getDefaultPath(project);
    }

    if (!_options.name) {
      throw new SchematicsException(`Action name is required`);
    }

    if (!_options.wizard) {
      throw new SchematicsException(`Wizard name is required`);
    }

    if (!_options.entityType) {
      throw new SchematicsException(`Entity Type name is required`);
    }

    if (!_options.namespace) {
      throw new SchematicsException(`Entity Type namespace is required`);
    }

    if (!_options.stepType) {
      throw new SchematicsException(`Step Type is required`);
    }

    if (_options.stepType !== 'Column View') {
      throw new SchematicsException(`Step Type not supported`);
    }

    const parsedPath = parseName(_options.path, _options.name);
    _options.name = parsedPath.name;
    _options.path = parsedPath.path;

    const skipStyleFile = _options.style === 'none';

    const templateSource = apply(url('./files/column-view'), [
      skipStyleFile ? filter((path) => !path.endsWith('.__style__.template')) : noop(),
      applyTemplates({
        ...strings,
        ..._options
      }),
      move(parsedPath.path)
    ]);

    if (templateSource == null) {
      throw new SchematicsException(`Step Type is not valid`);
    }

    return chain([mergeWith(templateSource)]);
  };
}
