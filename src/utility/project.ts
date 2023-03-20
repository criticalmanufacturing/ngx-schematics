
import { createWrappedNode, Project, ts } from "ts-morph";
import { dirname, extname, join, normalize } from "@angular-devkit/core";
import { Rule, Tree } from "@angular-devkit/schematics";
import { ProjectDefinition } from "@schematics/angular/utility";

import { createSourceFile, insertExport } from "./ast";
import { buildRelativePath, ProjectType } from "./workspace";
import { insertMetadata, MetadataProperty, PackageInfo, updatePackageInfo } from "./metadata";
import { JSONFile } from "./json";

/**
 * Update Metadata Options
 */
export interface UpdateMetadataOptions {
    imports: Record<string, string>;
    identifier: MetadataProperty;
    toInsert: string;
}

/**
 * Updates the project public api by adding all the created *.ts files to it.
 * @param project project definition from which the public api will be updated
 */
export function updatePublicAPI(project: ProjectDefinition): Rule {
    return async (tree: Tree) => {
        if (project.extensions['projectType'] !== ProjectType.Library ||
            !tree.exists(join(normalize(project.root), 'ng-package.json'))) {
            return;
        }

        const json = new JSONFile(tree, join(normalize(project.root), 'ng-package.json'));
        const entryFile = json.get(['lib', 'entryFile']) as string | null;

        if (!entryFile) {
            return;
        }

        const entryDir = join(tree.root.path, dirname(join(normalize(project.root), entryFile)));
        const filesToExport = tree.actions
            .filter(action => action.kind === 'c' && extname(action.path) === '.ts')
            .map((action) => ({ relativePath: buildRelativePath(entryDir, action.path), path: action.path }));

        const source = createSourceFile(tree, join(normalize(project.root), entryFile));

        if (!source) {
            return;
        }

        filesToExport.forEach((file) => {
            insertExport(source, '', file.relativePath.replace(extname(file.path), ''), true);
        });

        tree.overwrite(join(normalize(project.root), entryFile), source.getFullText());
    }
}

/**
 * Inserts in the metadata the information provided in the update options
 * @param project project definition from which the metadata will be updated
 * @param options Update options with the information to insert in the metadata
 */
export function updateMetadata(project: ProjectDefinition, options: UpdateMetadataOptions): Rule {
    return async (tree: Tree) => {
        const metadataPath = getMetadataFilePath(tree, project);

        if (!metadataPath) {
            return;
        }

        const metadataContent = tree.get(metadataPath)?.content.toString('utf-8');

        if (!metadataContent) {
            return;
        }

        const source = new Project().createSourceFile(metadataPath, metadataContent, { overwrite: true });

        insertMetadata(
            source,
            options.imports,
            options.identifier,
            options.toInsert
        );

        tree.overwrite(metadataPath, source.getFullText());
    };
}

/**
 * Updates the metadata package info properties
 * @param project project definition from which the metadata will be updated
 * @param options Update options with the information to insert in the metadata
 * @returns 
 */
export function updateMetadataPackageInfo(project: ProjectDefinition, options: PackageInfo): Rule {
    return async (tree: Tree) => {
        const metadataPath = getMetadataFilePath(tree, project);

        if (!metadataPath) {
            return;
        }

        const metadataContent = tree.get(metadataPath)?.content.toString('utf-8');

        if (!metadataContent) {
            return;
        }

        const source = new Project().createSourceFile(metadataPath, metadataContent, { overwrite: true });

        updatePackageInfo(
            source,
            options
        );

        tree.overwrite(metadataPath, source.getFullText());
    };
}

/**
 * Finds the metadata file path in the root given the public api
 * @param content File content to search the metadata on
 * @param fileName Metadata File Name
 */
export function getMetadataFilePath(tree: Tree, project: ProjectDefinition): string | undefined {
    if (!tree.exists(join(normalize(project.root), 'metadata', 'ng-package.json'))) {
        return;
    }

    const json = new JSONFile(tree, join(normalize(project.root), 'metadata', 'ng-package.json'));
    const entryFile = json.get(['lib', 'entryFile']) as string | null;

    if (!entryFile) {
        return;
    }

    const content = tree.get(join(normalize(project.root), 'metadata', entryFile))?.content.toString('utf-8');

    if (!content) {
        return;
    }

    const source = createWrappedNode(ts.createSourceFile(entryFile, content, ts.ScriptTarget.Latest, true));
    const exportNodes = source.getExportDeclarations();

    for (const node of exportNodes) {
        const module = node.getModuleSpecifierValue();

        if (module?.endsWith('metadata.service')) {
            return join(dirname(join(normalize(project.root), 'metadata', entryFile)), module) + '.ts';
        }
    }

    return;
}

export function updateTsConfig(rules: Record<string, any>) {
    return async (tree: Tree) => {
        if (!tree.exists('tsconfig.json')) {
            return;
        }

        const file = new JSONFile(tree, 'tsconfig.json');

        Object.keys(rules).forEach((rule) => {
            const jsonPath = rule.split('.');
            const newValue = rules[rule];
            const oldValue = file.get(jsonPath);

            file.modify(jsonPath, Array.isArray(oldValue) ? [...oldValue, ...newValue] : newValue);
        });
    };
}
