import {
  apply,
  applyTemplates,
  chain,
  mergeWith,
  move,
  Rule,
  SchematicsException,
  strings,
  Tree,
  url
} from '@angular-devkit/schematics';
import { readWorkspace } from '@schematics/angular/utility';
import { toConverterType, toValueType } from '../utility/iot';
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
      throw new SchematicsException(`Converter name is required`);
    }

    if (_options.path === undefined) {
      _options.path = buildDefaultPath(project);
    }

    const parsedPath = parseName(_options.path, _options.name);
    _options.name = parsedPath.name;
    _options.path = parsedPath.path;

    const templateSource = apply(url('./files'), [
      applyTemplates({
        ...strings,
        ..._options,
        inputType: toValueType(_options.input),
        outputType: toValueType(_options.output),
        converterInputType: toConverterType(_options.input),
        converterOutputType: toConverterType(_options.output),
        nameify
      }),
      move(parsedPath.path)
    ]);

    return chain([mergeWith(templateSource)]);
  };
}
