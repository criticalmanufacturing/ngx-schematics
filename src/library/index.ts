import {
    basename,
    join,
    normalize,
    strings
} from '@angular-devkit/core';
import {
    apply,
    applyTemplates,
    chain,
    externalSchematic,
    mergeWith,
    move,
    noop,
    Rule,
    Tree,
    url
} from '@angular-devkit/schematics';
import { readWorkspace } from '@schematics/angular/utility';

import { nameify } from '../utility/string';
import { addSymbolToNgModuleMetadata, createSourceFile } from '../utility/ast';
import { getAppModulePath, ProjectType, relativePathToWorkspaceRoot } from '../utility/workspace';
import { updateTsConfig } from '../utility/project';

function updateAppModule(options: any) {
    return async (host: Tree) => {
        const modulePath = await getAppModulePath(host);

        if (!modulePath) {
            return;
        }

        const source = createSourceFile(host, modulePath);

        if (!source) {
            return;
        }

        addSymbolToNgModuleMetadata(
            source,
            'imports',
            `${strings.classify(options.namePrefix)}MetadataModule`,
            options.packageName,
            'CoreModule'
        );

        host.overwrite(modulePath, source.getFullText());
    }
}

function createMetadataSubEntry(options: any) {
    return async (host: Tree) => {
        const workspace = await readWorkspace(host);
        const addedProject = Array.from(workspace.projects.keys()).find((projectName) => projectName === options.name);

        if (!addedProject) {
            return;
        }

        const project = workspace.projects.get(addedProject);
        const packageName = `${options.name}/metadata`;
        const folderName = basename(normalize(project!.root));
        const distRoot = `dist/${folderName}/metadata`;
        const namePrefix = addedProject.replace(/^cmf-/, '');

        const templateSource = apply(url('./files'), [
            applyTemplates({
                ...strings,
                nameify,
                fullName: addedProject,
                name: namePrefix,
                entryFile: 'public-api',
                relativePathToWorkspaceRoot: relativePathToWorkspaceRoot(join(normalize(project!.root), 'metadata')),
                distRoot: join(basename(normalize(project!.root)), 'metadata')
            }),
            move(join(normalize(project!.root), 'metadata'))
        ]);

        return chain([
            mergeWith(templateSource),
            options.skipTsConfig ? noop() : updateTsConfig([[['compilerOptions', 'paths', packageName], [distRoot]]]),
            updateAppModule({ packageName, namePrefix })
        ]);
    }
}

export default function (_options: any): Rule {
    return async (tree: Tree) => {
        if (!_options.prefix) {
            const folderName = _options.name.startsWith('@') ? _options.name.substr(1) : _options.name;

            if (/[A-Z]/.test(folderName)) {
                _options.prefix = strings.dasherize(folderName);
            }
        }

        const workspace = await readWorkspace(tree);

        let skipMetadata = _options.skipMetadata;
        let lint = _options.lint;
        delete _options.skipMetadata;
        delete _options.lint;

        if (lint === undefined) {
            const project = Array.from(workspace.projects.values()).find(proj => proj.extensions.projectType === ProjectType.Application);
            lint = project?.targets?.get('lint')?.builder?.startsWith('@angular-eslint');
        }

        return chain([
            externalSchematic(lint ? '@angular-eslint/schematics' : '@schematics/angular', 'library', { ..._options }),
            !skipMetadata ? createMetadataSubEntry({ ..._options }) : noop()
        ]);
    }
}
