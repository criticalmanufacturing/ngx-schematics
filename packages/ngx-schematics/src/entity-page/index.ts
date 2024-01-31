import {
  apply,
  applyTemplates,
  chain,
  mergeWith,
  move,
  Rule,
  SchematicContext,
  SchematicsException,
  Tree,
  url
} from '@angular-devkit/schematics';
import { readWorkspace, ProjectDefinition } from '@schematics/angular/utility';
import inquirer, { ListQuestion, InputQuestion } from 'inquirer';
import {
  createSourceFile,
  getDefaultPath,
  parseName,
  strings
} from '@criticalmanufacturing/schematics-devkit';
import { Schema } from './schema';
import {
  insertRoutesMetadata,
  MetadataProperty,
  getMetadataFilePath,
  updateMetadata
} from '../utility/metadata';
import { updateLibraryAPI } from '../utility/update-library-api';

function updateRoutesMetadata(project: ProjectDefinition, options: any) {
  return async (tree: Tree) => {
    const metadataPath = getMetadataFilePath(tree, project);

    if (!metadataPath) {
      return;
    }

    const source = createSourceFile(tree, metadataPath);

    if (!source) {
      return;
    }

    const toInsert = `\
{
    path: 'Entity/${strings.classify(options.name)}/:id',
    loadChildren: () => import(
        /* webpackExports: "Page${strings.classify(options.name)}RoutingModule" */
        '${strings.dasherize(options.project)}').then(m => m.Page${strings.classify(
          options.name
        )}RoutingModule)
}
`;

    insertRoutesMetadata(source, {}, toInsert);
    tree.overwrite(metadataPath, source.getFullText());
  };
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
      throw new SchematicsException(`Entity Type namespace is required`);
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

    const templateSource = apply(url('./files'), [
      applyTemplates({
        ...strings,
        ..._options
      }),
      move(parsedPath.path)
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
      updateLibraryAPI(project),
      updateMetadata(project, metadataOptions),
      updateRoutesMetadata(project, _options)
    ]);
  };
}
