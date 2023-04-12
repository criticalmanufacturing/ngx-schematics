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
import { strings, getDefaultPath, parseName } from '@criticalmanufacturing/schematics-devkit';
import { Schema } from './schema';
import { updateMetadataPackageInfo } from '../utility/metadata';
import { updateLibraryAPI } from '../utility/update-library-api';

export default function (_options: Schema): Rule {
  return async (tree: Tree, _context: SchematicContext) => {
    const workspace = await readWorkspace(tree);
    const project = workspace.projects.get(_options.project);

    if (!project) {
      throw new SchematicsException(`Project "${_options.project}" does not exist.`);
    }

    if (!_options.name) {
      throw new SchematicsException(`Data Source name is required`);
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

    return chain([
      mergeWith(templateSource),
      updateLibraryAPI(project),
      updateMetadataPackageInfo(project, {
        dataSources: [strings.classify(_options.name) + 'DataSource'],
        package: _options.project
      })
    ]);
  };
}
