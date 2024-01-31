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
import {
  createSourceFile,
  getDefaultPath,
  parseName,
  strings
} from '@criticalmanufacturing/schematics-devkit';
import { ProjectDefinition, readWorkspace } from '@schematics/angular/utility';
import inquirer, { InputQuestion } from 'inquirer';
import {
  getMetadataFilePath,
  insertRoutesMetadata,
  MetadataProperty,
  updateMetadata,
  UpdateMetadataOptions
} from '../utility/metadata';
import { updateLibraryAPI } from '../utility/update-library-api';
import { Schema } from './schema';

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
      path: '${strings.classify(options.pageId.replace('.', '/'))}',
      loadChildren: () => import(
          /* webpackExports: "Page${strings.classify(options.name)}RoutingModule" */
          '${strings.dasherize(options.project)}').then(m => m.Page${strings.classify(
            options.name
          )}RoutingModule),
      data: {
        title: $localize\`:@@${strings.dasherize(options.project)}/page-${strings.dasherize(
          options.name
        )}#TITLE:${strings.nameify(options.name)}\`,
        iconClass: '${options.iconClass}',
        requiredFunctionalities: '${options.pageId}'
      }
  }`;

    insertRoutesMetadata(source, {}, toInsert);
    tree.overwrite(metadataPath, source.getFullText());
  };
}

function getEntrypointMetadata(options: Schema): UpdateMetadataOptions {
  if (options.entrypoint === 'Menu Item') {
    return {
      identifier: MetadataProperty.MenuItem,
      imports: {},
      toInsert: `\
      {
        id: '${options.pageId}',
        menuGroupId: '${options.menuGroupId}',\
        ${
          options.menuSubGroupId!.length > 0 ? `\nmenuSubGroupId: '${options.menuSubGroupId}',` : ''
        }
        title: $localize\`:@@${strings.dasherize(options.project)}/page-${strings.dasherize(
          options.name
        )}#TITLE:${strings.nameify(options.name)}\`,
        actionId: '${options.pageId}',
        position: 1,
        iconClass: '${options.iconClass}',
        requiredFunctionalities: '${options.pageId}'
      }`
    };
  }

  return {
    identifier: MetadataProperty.ActionButton,
    imports: {},
    toInsert: `\
    {
      id: '${options.pageId}',
      actionId: '${options.pageId}',
      title: $localize\`:@@${strings.dasherize(options.project)}/page-${strings.dasherize(
        options.name
      )}#TITLE:${strings.nameify(options.name)}\`,
      iconClass: '${options.iconClass}',
    }`
  };
}

export default function (_options: Schema): Rule {
  return async (tree: Tree, _context: SchematicContext) => {
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

    if (!_options.pageId) {
      throw new SchematicsException(`Page Id is required`);
    }

    if (!_options.iconClass) {
      throw new SchematicsException(`Icon class is required`);
    }

    if (_options.entrypoint === 'Menu Item' && !_options.menuGroupId) {
      const questions: InputQuestion[] = [
        {
          type: 'input',
          name: 'menuGroupId',
          message: 'What is the Menu Group Id?'
        },
        {
          type: 'input',
          name: 'menuSubGroupId',
          message: 'What is the Menu Sub Group Id? (ignore if not applicable)'
        }
      ];

      const answers = await inquirer.prompt(questions);
      _options.menuGroupId = answers.menuGroupId;
      _options.menuSubGroupId = answers.menuSubGroupId;
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
      imports: { ActionData: 'cmf-core', LinkType: 'cmf-core', LinkTarget: 'cmf-core' },
      toInsert: `\
  {
    id: '${_options.pageId}',
    handler: (context: any): Promise<ActionData> => {
      return Promise.resolve({
          route: {
            type: LinkType.Internal,
            target: LinkTarget.Self,
            url: '${strings.classify(_options.pageId.replace('.', '/'))}',
            alt: ''
        }
      });
  }
  }`
    };

    return chain([
      mergeWith(templateSource),
      updateLibraryAPI(project),
      updateMetadata(project, metadataOptions),
      updateMetadata(project, getEntrypointMetadata(_options)),
      updateRoutesMetadata(project, _options)
    ]);
  };
}
