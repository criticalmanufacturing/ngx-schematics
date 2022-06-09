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
import { JSONFile } from '@schematics/angular/utility/json-file';

import { nameify } from '../utility/string';
import { addSymbolToNgModuleMetadata, createSourceFile } from '../utility/ast';
import { getAppModulePath, relativePathToWorkspaceRoot } from '../utility/workspace';

function updateTsConfig(packageName: string, ...paths: string[]) {
    return (host: Tree) => {
        if (!host.exists('tsconfig.json')) {
            return host;
        }

        const file = new JSONFile(host, 'tsconfig.json');
        const jsonPath = ['compilerOptions', 'paths', packageName];
        const value = file.get(jsonPath);
        file.modify(jsonPath, Array.isArray(value) ? [...value, ...paths] : paths);
    };
}

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
        const pathImportLib = `${distRoot}/${packageName.replace('/', '-')}`;
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
            options.skipTsConfig ? noop() : updateTsConfig(packageName, pathImportLib, distRoot),
            updateAppModule({ packageName, namePrefix })
        ]);
    }
}

export default function (_options: any): Rule {
    return () => {
        if (!_options.prefix) {
            const folderName = _options.name.startsWith('@') ? _options.name.substr(1) : _options.name;

            if (/[A-Z]/.test(folderName)) {
                _options.prefix = strings.dasherize(folderName);
            }
        }

        return chain([
            externalSchematic('@angular-eslint/schematics', 'library', { ..._options }),
            createMetadataSubEntry({ ..._options })
        ]);
    }
}
