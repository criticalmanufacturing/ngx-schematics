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
import { strings } from '@angular-devkit/core';
import { readWorkspace, ProjectDefinition } from '@schematics/angular/utility';
import * as inquirer from 'inquirer';

import { nameify } from '../utility/string';
import { insertRoutesMetadata, MetadataProperty } from '../utility/metadata';
import { updatePublicAPI, updateMetadata, getMetadataFilePath } from '../utility/project';
import { buildDefaultPath, parseName } from '../utility/workspace';
import { createSourceFile } from '../utility/ast';

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
        '${strings.dasherize(options.project)}').then(m => m.Page${strings.classify(options.name)}RoutingModule)
}
`;

        insertRoutesMetadata(source, {}, toInsert);
        tree.overwrite(metadataPath, source.getFullText());
    }
}

export default function (_options: any): Rule {
    return async (tree: Tree, _context: SchematicContext) => {
        if (!_options.namespace) {
            const question: inquirer.ListQuestion = {
                type: 'list',
                name: 'namespace',
                message: 'What is the business objects namespace of the entity type?',
                choices: ['Foundation', 'Navigo', 'Other (specify)']
            };

            _options.namespace = (await inquirer.prompt([question])).namespace;

            if ((_options.namespace as string).startsWith('Other')) {
                const question: inquirer.InputQuestion = {
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
        const project = workspace.projects.get(_options.project as string);

        if (!project) {
            throw new SchematicsException(`Project "${_options.project}" does not exist.`);
        }

        if (_options.path === undefined) {
            _options.path = buildDefaultPath(project);
        }

        const parsedPath = parseName(_options.path as string, _options.name);
        _options.name = parsedPath.name;
        _options.path = parsedPath.path;

        const templateSource = apply(url('./files'), [
            applyTemplates({
                ...strings,
                ..._options,
                nameify,
                project: _options.project
            }),
            move(parsedPath.path),
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
            updatePublicAPI(project),
            updateMetadata(project, metadataOptions),
            updateRoutesMetadata(project, _options)
        ]);
    }
}
