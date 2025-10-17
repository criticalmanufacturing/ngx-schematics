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
import {
  promptNamespace,
  createSourceFile,
  getDefaultPath,
  parseName,
  strings
} from '@criticalmanufacturing/schematics-devkit';
import { Schema } from './schema.js';
import {
  insertRoutesMetadata,
  MetadataProperty,
  getMetadataFilePath,
  updateMetadata,
  UpdateMetadataOptions
} from '../utility/metadata.js';
import { updateLibraryAPI } from '../utility/update-library-api.js';

function updateRoutesMetadata(project: ProjectDefinition, options: Schema) {
  return async (tree: Tree) => {
    const metadataPath = getMetadataFilePath(tree, project);

    if (!metadataPath) {
      return;
    }

    const source = createSourceFile(tree, metadataPath);

    if (!source) {
      return;
    }

    const toInsert = `
{
  path: 'Entity/${strings.classify(options.name)}/:id',
  loadChildren: async () =>
    EntityTypeMetadataService.getRoutes(
      '${strings.classify(options.name)}',
      (
        await import(
          /* webpackExports: "Page${strings.classify(options.name)}Component" */
          '${strings.dasherize(options.project)}'
        )
      ).Page${strings.classify(options.name)}Component
    )
}
`;

    insertRoutesMetadata(source, { EntityTypeMetadataService: 'cmf-core' }, toInsert);
    tree.overwrite(metadataPath, source.getFullText());
  };
}

export default function (_options: Schema): Rule {
  return async (tree: Tree, _context: SchematicContext) => {
    if (!_options.namespace) {
      _options.namespace = await promptNamespace();
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

    const metadataOptions: UpdateMetadataOptions = {
      identifier: MetadataProperty.EntityType,
      imports: { DEFAULT_DETAILS_VIEW_ID: 'cmf-core' },
      toInsert: `
{
  name: '${strings.classify(_options.name)}',
  views: [
    {
        id: DEFAULT_DETAILS_VIEW_ID,
        loadComponent: async () =>
            (
                await import(
                    /* webpackExports: "Page${strings.classify(_options.name)}DetailsViewComponent" */
                    '${strings.dasherize(_options.project)}'
                )
            ).Page${strings.classify(_options.name)}DetailsViewComponent
    }
  ]
}
`
    };

    return chain([
      mergeWith(templateSource),
      updateLibraryAPI(project),
      updateMetadata(project, metadataOptions),
      updateRoutesMetadata(project, _options)
    ]);
  };
}
