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
import { strings } from '@angular-devkit/core';
import { readWorkspace } from '@schematics/angular/utility';
import * as inquirer from 'inquirer';

import { MetadataProperty } from '../utility/metadata';
import { nameify } from '../utility/string';
import { updatePublicAPI, updateMetadata } from '../utility/project';
import { buildDefaultPath, parseName } from '../utility/workspace';
import { Schema } from './schema';

export default function (_options: Schema): Rule {
    return async (tree: Tree, _context: SchematicContext) => {
        if (!_options.namespace) {
            const question: inquirer.ListQuestion = {
                type: 'list',
                name: 'namespace',
                message: 'What is the business objects namespace of the entity type?',
                choices: ['Foundation', 'Navigo', 'Other (specify)']
            };

            _options.namespace = (await inquirer.prompt([question])).namespace;

            if (_options.namespace!.startsWith('Other')) {
                const question: inquirer.InputQuestion = {
                    type: 'input',
                    name: 'namespace',
                    message: 'Namespace'
                };

                _options.namespace = (await inquirer.prompt([question])).namespace;
            }
        }

        const workspace = await readWorkspace(tree);
        const project = workspace.projects.get(_options.project);

        if (!project) {
            throw new SchematicsException(`Project "${_options.project}" does not exist.`);
        }

        if (_options.path === undefined) {
            _options.path = buildDefaultPath(project);
        }

        if (!_options.name) {
            throw new SchematicsException(`Action name is required`);
        }

        if (!_options.entityType) {
            throw new SchematicsException(`Entity Type name is required`);
        }

        if (!_options.namespace) {
            throw new SchematicsException(`Entity Type mamespace is required`);
        }

        const parsedPath = parseName(_options.path, _options.name);
        _options.name = parsedPath.name.replace(/^(wizard)?-?/i, '');
        _options.path = parsedPath.path;

        const skipStyleFile = _options.style === 'none';

        const templateSource = apply(url('./files'), [
            skipStyleFile ? filter((path) => !path.endsWith('.__style__.template')) : noop(),
            applyTemplates({
                ...strings,
                ..._options,
                nameify
            }),
            move(parsedPath.path)
        ]);

        const metadataOptions = {
            identifier: MetadataProperty.Action,
            imports: { 'ActionMode': 'cmf-core' },
            toInsert: `\
{
  id: '${strings.classify(_options.entityType)}.${strings.classify(_options.name).replace(strings.classify(_options.entityType), '')}',
  loadComponent: () => import(
    /* webpackExports: "Wizard${strings.classify(_options.name)}Component" */
    '${_options.project}').then(m => m.Wizard${strings.classify(_options.name)}Component),
  mode: ActionMode.ModalPage
}`
        };

        return chain([
            mergeWith(templateSource),
            updatePublicAPI(project),
            updateMetadata(project, metadataOptions)
        ]);
    }
}