import { join, normalize, dirname } from '@angular-devkit/core';
import { chain, Rule, SchematicContext, SchematicsException, Tree } from '@angular-devkit/schematics';
import { readWorkspace, ProjectDefinition } from '@schematics/angular/utility';

import { setPackageInfoMetadata, PackageInfo } from '../utility/metadata';
import { getMetadataFilePath } from '../utility/project';
import { createSourceFile } from '../utility/ast';
import { JSONFile } from '../utility/json';


function getAllFiles(host: Tree, rootPath: string): string[] {
    if (!host.exists(join(normalize(rootPath), 'ng-package.json'))) {
        return [];
    }

    const json = new JSONFile(host, join(normalize(rootPath), 'ng-package.json'));
    const entryFile = json.get(['lib', 'entryFile']) as string | null;

    if (!entryFile) {
        return [];
    }

    const filesToSearch: string[] = [join(normalize(rootPath), entryFile)];
    const filesFound: string[] = [];

    while (filesToSearch.length > 0) {
        const file = filesToSearch.pop()!;
        const sourceFile = createSourceFile(host, file);

        if (!sourceFile) {
            continue;
        }

        sourceFile.getExportDeclarations().forEach((node) => {
            const modulePath = node.getModuleSpecifierValue();

            if (!modulePath) {
                return;
            }

            const path = join(dirname(normalize(file)), modulePath + '.ts');

            if (!host.exists(path)) {
                return;
            }

            if (!filesFound.includes(path)) {
                filesFound.push(path);

                if (!filesToSearch.includes(path)) {
                    filesToSearch.push(path);
                }
            }
        });
    }

    return filesFound;
}

function fillMetadataPackageInfo(project: ProjectDefinition, options: Required<PackageInfo>): Rule {
    return (tree: Tree) => {
        const metadataPath = getMetadataFilePath(tree, project);

        if (!metadataPath) {
            return;
        }
        const source = createSourceFile(tree, metadataPath);

        if (!source) {
            return;
        }

        setPackageInfoMetadata(source, options);
        tree.overwrite(metadataPath, source.getFullText());
    }
}


export default function (_options: any): Rule {
    return async (tree: Tree, _context: SchematicContext) => {
        const workspace = await readWorkspace(tree);
        const project = workspace.projects.get(_options.project);

        if (!project) {
            throw new SchematicsException(`Project "${_options.project}" does not exist.`);
        }


        if (project.extensions['projectType'] !== 'library' || !project.sourceRoot) {
            return;
        }

        const packageInfo: Required<PackageInfo> = {
            package: _options.project,
            widgets: [],
            converters: [],
            dataSources: [],
            components: []
        }

        getAllFiles(tree, project.root).forEach((file) => {
            const source = createSourceFile(tree, file);

            if (!source) {
                return;
            }

            source?.getClasses().forEach((node) => {
                const className = node.getName();

                if (node.isAbstract() || !className) {
                    return;
                }

                if (node.getDecorator('Widget')) {
                    packageInfo.widgets.push(className);
                } else if (node.getDecorator('DataSource')) {
                    packageInfo.dataSources.push(className);
                } else if (node.getDecorator('Converter')) {
                    packageInfo.converters.push(className);
                } else if (node.getDecorator('Component')) {
                    packageInfo.components.push(className);
                }
            });
        });

        return chain([
            fillMetadataPackageInfo(project, packageInfo)
        ]);
    }
}