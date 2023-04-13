import { join, normalize } from '@angular-devkit/core';
import {
  apply,
  applyTemplates,
  chain,
  mergeWith,
  move,
  Rule,
  SchematicsException,
  Tree,
  url
} from '@angular-devkit/schematics';
import { readWorkspace } from '@schematics/angular/utility';
import { toConverterType, toValueType } from '../utility/iot-value-types';
import { getDefaultPath, parseName, strings } from '@criticalmanufacturing/schematics-devkit';
import { Schema } from './schema';
import { updateLibraryAPI } from '../utility/update-library-api';
import { updateLibraryMetadata } from '../utility/update-library-metadata';

export default function (_options: Schema): Rule {
  return async (tree: Tree) => {
    const workspace = await readWorkspace(tree);
    const project = workspace.projects.get(_options.project);

    if (!project) {
      throw new SchematicsException(`Project "${_options.project}" does not exist.`);
    }

    if (!_options.name) {
      throw new SchematicsException(`Converter name is required`);
    }

    if (_options.path === undefined) {
      _options.path = join(normalize(getDefaultPath(project)), 'converters');
    }

    const parsedPath = parseName(_options.path, _options.name);
    _options.name = parsedPath.name;
    _options.path = parsedPath.path;

    const context = {
      ...strings,
      ..._options,
      inputType: toValueType(_options.inputType),
      outputType: toValueType(_options.outputType),
      converterInputType: toConverterType(_options.inputType),
      converterOutputType: toConverterType(_options.outputType)
    };

    const templateSource = apply(url('./files/src'), [
      applyTemplates(context),
      move(parsedPath.path)
    ]);

    const testsPath = join(normalize(project.root), 'test', 'unit', 'converters');

    const templateTest = apply(url('./files/test'), [applyTemplates(context), move(testsPath)]);

    return chain([
      mergeWith(templateSource),
      mergeWith(templateTest),
      updateLibraryMetadata(project, {
        converters: [strings.camelize(_options.name)]
      }),
      updateLibraryAPI({
        project: _options.project,
        tasks: [],
        converters: [{ path: _options.path, name: _options.name }]
      })
    ]);
  };
}
