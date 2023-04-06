import { join, normalize } from '@angular-devkit/core';
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
  strings,
  Tree,
  url
} from '@angular-devkit/schematics';
import { readWorkspace } from '@schematics/angular/utility';
import { updatePackageMetadata, updatePublicAPI } from '../utility/iot';
import { nameify } from '../utility/string';
import { buildDefaultPath, parseName } from '../utility/workspace';
import { Schema } from './schema';

export default function (_options: Schema): Rule {
  return async (tree: Tree) => {
    const workspace = await readWorkspace(tree);
    const project = workspace.projects.get(_options.project);

    if (!project) {
      throw new SchematicsException(
        `Project "${_options.project}" does not exist.`
      );
    }

    if (!_options.name) {
      throw new SchematicsException(`Task name is required`);
    }

    if (_options.path === undefined) {
      _options.path = buildDefaultPath(project);
    }

    const parsedPath = parseName(_options.path, _options.name);
    _options.name = parsedPath.name;
    _options.path = parsedPath.path;

    const skipStyleFile = _options.style === 'none';

    const templateSource = apply(url('./files/src'), [
      skipStyleFile
        ? filter((path) => !path.endsWith('.__style__.template'))
        : noop(),
      applyTemplates({
        ...strings,
        ..._options,
        nameify
      }),
      move(parsedPath.path)
    ]);

    const testsPath = join(normalize(project.root), 'test', 'unit', 'tasks');

    const templateTest = apply(url('./files/test'), [
      applyTemplates({
        ...strings,
        ..._options,
        nameify
      }),
      move(testsPath)
    ]);

    return chain([
      mergeWith(templateSource),
      mergeWith(templateTest),
      updatePackageMetadata(project, {
        tasks: [strings.camelize(_options.name)]
      }),
      updatePublicAPI({
        project: _options.project,
        tasks: [{ path: _options.path, name: _options.name }],
        converters: []
      })
    ]);
  };
}
