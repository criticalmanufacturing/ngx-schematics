import {
    apply,
    applyTemplates,
    chain,
    externalSchematic,
    mergeWith,
    move,
    noop,
    Rule,
    SchematicContext,
    SchematicsException,
    Tree,
    url
} from '@angular-devkit/schematics';

import {
    readWorkspace,
    writeWorkspace
} from '@schematics/angular/utility';

import {
    NodePackageInstallTask
} from '@angular-devkit/schematics/tasks';

import {
    dirname,
    join,
    JsonArray,
    JsonObject,
    normalize
} from '@angular-devkit/core';

import { posix } from 'path';
import { isDeepStrictEqual } from 'util';
import { exec } from 'child_process';

import {
    ObjectLiteralExpression,
    PropertyAssignment,
    SourceFile,
    SyntaxKind
} from 'ts-morph';

import {
    parse
} from 'node-html-parser';

import * as inquirer from 'inquirer';

import {
    CORE_BASE_MODULE,
    MES_BASE_MODULE,
    METADATA_ROUTING_MODULE,
    PROJECT_ALLOWED_COMMONJS_DEPENDENCIES,
    PROJECT_ASSETS,
    PROJECT_CORE_STYLES,
    PROJECT_MES_ASSETS,
    PROJECT_MES_STYLES,
    PROJECT_SCRIPTS
} from './package-configs';

import { getAppModulePath, getMainPath } from '../utility/workspace';
import { addSymbolToNgModuleMetadata, createSourceFile, insertImport } from '../utility/ast';
import { updateTsConfig } from '../utility/project';
import { addPackageJsonDependency, NodeDependency, NodeDependencyType } from '../utility/dependency';

import { version as pkgVersion, name as pkgName } from '../../package.json';
import { Schema } from './schema';

/**
 * List ngx-schematics release tags of the current version
 */
function listNpmReleaseTags(pkg: string) {
    return new Promise<string[]>((resolve, reject) => {
        exec(`npm dist-tag ls ${pkg}`, (error, stdout, stderr) => {
            if (error) {
                return reject(new Error(stderr))
            }

            return resolve(stdout.match(/^[^:]+/gm)?.reverse() ?? []);
        });
    });
}

/**
 * Adds elements to json array if not already present.
 * @param array array of elements
 * @param elementsToAdd elements to add to array
 */
function addToJsonArray(array: JsonArray, elementsToAdd: any[]) {
    elementsToAdd.forEach((toAdd) => {
        if (!array.some(existing => isDeepStrictEqual(typeof existing === 'object' ? { ...existing } : existing, toAdd))) {
            array.push(toAdd);
        }
    })
}

/**
 * Updates index.html file with the themes and loading container
 */
function updateIndexFile(path: string): Rule {
    return async (tree: Tree) => {
        const indexText = tree.readText(path);
        const index = parse(indexText, { comment: true });

        const title = index.querySelector('head > title');
        if (title) {
            title.textContent = 'MES';
        }

        const body = index.querySelector('body');
        if (body && !body.querySelector('div#loading-container')) {
            body.insertAdjacentHTML('afterbegin', `
  <div id="loading-container" class="cmf-loading-container">
    <div class="cmf-loading-center">
    <div class="cmf-loading-cmf-logo"></div>
    <div class="cmf-loading-spinner"></div>
    </div>
  </div>`);
        }

        const head = index.querySelector('head');
        if (head && !head.querySelector('style#initial-theme')) {
            head.appendChild(
                parse(`\
  <style id="initial-theme">
    @import url("cmf.style.blue.css") (prefers-color-scheme: light);
    @import url("cmf.style.dark.css") (prefers-color-scheme: dark);
  </style>\n`
                ));
        }

        tree.overwrite(path, index.toString());
    }
}


/**
 * Updates main.ts file adding the load config method
 */
function installSchematics(_options: Required<Schema>) {
    return async (host: Tree, _context: SchematicContext) => {
        const workspace = await readWorkspace(host);

        const project = workspace.projects.get(_options.project);

        if (!project) {
            throw new SchematicsException(`Project is not defined in this workspace.`);
        }

        if (!workspace.extensions.cli) {
            workspace.extensions.cli = {};
        }

        if (!(workspace.extensions.cli as JsonObject).schematicCollections) {
            (workspace.extensions.cli as JsonObject).schematicCollections = [];
        }

        if (!((workspace.extensions.cli as JsonObject).schematicCollections as JsonArray).includes('@criticalmanufacturing/ngx-schematics')) {
            ((workspace.extensions.cli as JsonObject).schematicCollections as JsonArray).unshift('@criticalmanufacturing/ngx-schematics');
        }

        const buildTargets = [];

        for (const target of project.targets.values()) {
            if (target.builder === '@angular-devkit/build-angular:browser') {
                buildTargets.push(target);
            }
        }

        // Configure project options
        for (const target of buildTargets) {
            // override configurations
            if (target.configurations) {
                const budgets = target.configurations!['production']?.['budgets'] as JsonArray | undefined;
                const initialBudget = budgets?.findIndex(budget => (budget as JsonObject).type === 'initial');

                if (budgets && initialBudget != null && initialBudget >= 0) {
                    budgets[initialBudget] = {
                        ...(budgets[initialBudget] as JsonObject),
                        maximumWarning: _options.application === 'MES' ? '11mb' : '10mb',
                        maximumError: _options.application === 'MES' ? '12mb' : '11mb'
                    };
                }
            }

            // override options
            if (target.options) {
                // Add allowedCommonJsDependencies
                if (target.options.allowedCommonJsDependencies instanceof Array) {
                    addToJsonArray(target.options.allowedCommonJsDependencies, PROJECT_ALLOWED_COMMONJS_DEPENDENCIES);
                } else {
                    target.options.allowedCommonJsDependencies = PROJECT_ALLOWED_COMMONJS_DEPENDENCIES;
                }

                // Add assets
                if (target.options.assets instanceof Array) {
                    const index = target.options.assets.indexOf('src/favicon.ico');
                    if (index >= 0) {
                        target.options.assets.splice(index, 1);
                        if (host.exists('src/favicon.ico')) {
                            host.delete('src/favicon.ico');
                        }
                    }

                    addToJsonArray(target.options.assets, _options.application === 'MES' ? PROJECT_MES_ASSETS : PROJECT_ASSETS);
                }

                // Add styles
                if (target.options.styles instanceof Array) {
                    addToJsonArray(target.options.styles, _options.application === 'MES' ? PROJECT_MES_STYLES : PROJECT_CORE_STYLES);
                }

                // Add scripts
                if (target.options.scripts instanceof Array) {
                    addToJsonArray(target.options.scripts, PROJECT_SCRIPTS);
                }
            }
        }

        // Find all index.html files in build targets
        const indexFiles = new Set<string>();
        for (const target of buildTargets) {
            if (typeof target.options?.index === 'string') {
                indexFiles.add(target.options.index);
            }

            if (!target.configurations) {
                continue;
            }

            for (const options of Object.values(target.configurations)) {
                if (typeof options?.index === 'string') {
                    indexFiles.add(options.index);
                }
            }
        }

        const buildTarget = project.targets.get('build');
        if (!buildTarget) {
            throw new SchematicsException(`Project target "build" not found.`);
        }

        // Setup sources for the assets files to add to the project
        const sourcePath = project.sourceRoot ?? posix.join(project.root, 'src');

        const templateSource = apply(url('./files'), [
            applyTemplates({
                startupCulture: 'en-US',
                startupTheme: 'cmf.style.blue',
                supportedCultures: `[
      "en-US",
      "pt-PT",
      "de-DE",
      "vi-VN",
      "zh-CN",
      "zh-TW",
      "es-ES",
      "pl-PL",
      "sv-SE",
      "fr-FR"
    ]`,
                supportedThemes: `[
      "cmf.style.blue",
      "cmf.style.blue.accessibility",
      "cmf.style.dark",
      "cmf.style.dark.accessibility",
      "cmf.style.gray",
      "cmf.style.gray.accessibility",
      "cmf.style.contrast",
      "cmf.style.contrast.accessibility"
    ]`
            }),
            move(posix.join(sourcePath, 'assets')),
        ]);

        await writeWorkspace(host, workspace);

        const dependencies = [];
        if (_options.application === 'MES') {
            dependencies.push({
                type: NodeDependencyType.Default,
                name: MES_BASE_MODULE[0],
                version: _options.version
            });
        } else {
            dependencies.push({
                type: NodeDependencyType.Default,
                name: CORE_BASE_MODULE[0],
                version: _options.version
            });
        }

        return chain([
            emptyDir(posix.join(sourcePath, 'assets', 'icons')),
            mergeWith(templateSource),
            installDependencies(dependencies),
            ...[...indexFiles].map((path) => updateIndexFile(path)),
            overrideComponentTemplate(),
            updateAppModule(_options.application),
            updateMain(),
            updateTsConfig({
                "compilerOptions.strictFunctionTypes": false,
                "compilerOptions.noImplicitAny": false,
                "compilerOptions.strictNullChecks": false,
                "compilerOptions.allowSyntheticDefaultImports": true
            })
        ]);
    };
}

/**
 * Updates main.ts file adding the load config method
 */
function updateMain() {
    return async (host: Tree, _context: SchematicContext) => {
        const mainPath = await getMainPath(host);

        if (!mainPath) {
            return;
        }

        // add imports
        const source = createSourceFile(host, mainPath);

        if (!source) {
            return;
        }

        const loadAppConfigCall = source
            .getDescendantsOfKind(SyntaxKind.CallExpression)
            .find(node => node.getExpression().getText().endsWith('loadApplicationConfig'));

        // already added -> nothing to do
        if (loadAppConfigCall) {
            return;
        }

        const bootstrapCall = source
            .getDescendantsOfKind(SyntaxKind.CallExpression)
            .find(node => node.getExpression().getText().endsWith('bootstrapModule'));


        if (!bootstrapCall) {
            return;
        }

        const bootstrapStatement = bootstrapCall.getFirstAncestorByKind(SyntaxKind.ExpressionStatement);
        const moduleIdentifier = bootstrapCall.getArguments()[0]?.asKind(SyntaxKind.Identifier);

        if (!bootstrapStatement || !moduleIdentifier) {
            return;
        }

        // remove app module import declaration
        source
            .getDescendantsOfKind(SyntaxKind.Identifier)
            .filter((node) => node.getText() === moduleIdentifier.getText())
            .find(node => node.getFirstAncestorByKind(SyntaxKind.ImportDeclaration))
            ?.getFirstAncestorByKindOrThrow(SyntaxKind.ImportDeclaration)
            .remove();

        // add load application config statement
        moduleIdentifier.replaceWithText(`m.${moduleIdentifier.getText()}`);
        bootstrapStatement.replaceWithText(`\
loadApplicationConfig('assets/config.json').then(() => {
    import(/* webpackMode: "eager" */'./app/app.module').then((m) => {
        ${bootstrapStatement.getText(true)}
    });
});`)

        insertImport(source, 'loadApplicationConfig', 'cmf-core/init');

        source.formatText({ indentSize: 2 });

        host.overwrite(mainPath, source.getFullText());
    };
}

/**
 * Updates app module adding the desired package modules
 */
function updateAppModule(baseApp: string): Rule {
    return async (host: Tree) => {
        const appModulePath = await getAppModulePath(host);

        if (!appModulePath) {
            return;
        }

        // add imports
        const source = createSourceFile(host, appModulePath);

        if (!source) {
            return;
        }

        if (baseApp === 'MES') {
            addSymbolToNgModuleMetadata(source, 'imports', MES_BASE_MODULE[1], MES_BASE_MODULE[0]);
        } else {
            addSymbolToNgModuleMetadata(source, 'imports', CORE_BASE_MODULE[1], CORE_BASE_MODULE[0]);
        }

        addSymbolToNgModuleMetadata(source, 'imports', METADATA_ROUTING_MODULE[1], METADATA_ROUTING_MODULE[0]);

        source.formatText();
        host.overwrite(appModulePath, source.getFullText());

        return;
    };
}

/**
 * Installs application dependencies in package.json
 */
function installDependencies(dependencies: NodeDependency[]) {
    return (host: Tree, _context: SchematicContext) => {
        dependencies.forEach((dependency) => addPackageJsonDependency(host, dependency));
        _context.addTask(new NodePackageInstallTask());
        return host;
    };
}

/**
 * Adds a set of packages to the package.json in the given host tree.
 */
function emptyDir(sourcePath: string) {
    return (host: Tree) => {
        host.getDir(sourcePath).subfiles.forEach((path) => {
            host.delete(posix.join(sourcePath, path));
        });
    };
}

function getMetadataProperty(metadata: ObjectLiteralExpression, propertyName: string): PropertyAssignment | undefined {
    return metadata.getProperties()
        .find((prop) => prop.asKind(SyntaxKind.PropertyAssignment)?.getName() === propertyName)
        ?.asKindOrThrow(SyntaxKind.PropertyAssignment);
}

async function getBootstrapComponentPath(source: SourceFile): Promise<string | undefined> {
    let metadataNode: ObjectLiteralExpression | undefined;
    for (const classNode of source.getClasses()) {
        metadataNode = classNode
            .getDecorator('NgModule')
            ?.getArguments()[0]
            ?.asKind(SyntaxKind.ObjectLiteralExpression);

        if (metadataNode) {
            break;
        }
    }

    if (!metadataNode) {
        return;
    }

    const bootstrapProperty = getMetadataProperty(metadataNode, 'bootstrap');

    if (!bootstrapProperty) {
        return;
    }

    const arrLiteral = bootstrapProperty.getInitializer()
        ?.asKind(SyntaxKind.ArrayLiteralExpression);

    const componentSymbol = arrLiteral?.getElements()[0]?.getText();

    if (!componentSymbol) {
        return;
    }

    const relativePath = source.getImportDeclarations()
        .find(impDec => impDec.getNamedImports().some(imp => imp.getName() === componentSymbol))
        ?.getModuleSpecifierValue();

    return relativePath + '.ts';
}

function getComponentMetadata(source: SourceFile): ObjectLiteralExpression | undefined {
    // Find the decorator declaration.
    let compMetadata: ObjectLiteralExpression | undefined;
    for (const classNode of source.getClasses()) {
        compMetadata = classNode
            .getDecorator('Component')
            ?.getArguments()[0]
            ?.asKind(SyntaxKind.ObjectLiteralExpression);

        if (compMetadata) {
            return compMetadata;
        }
    }
}

function overrideComponentTemplate() {
    return async (host: Tree) => {
        const modulePath = await getAppModulePath(host);

        if (!modulePath) {
            return;
        }

        const moduleSource = createSourceFile(host, modulePath);

        if (!moduleSource) {
            return;
        }

        const compPath = await getBootstrapComponentPath(moduleSource);

        if (!compPath) {
            return;
        }

        const compFilePath = join(dirname(normalize(modulePath)), compPath);
        const compSource = createSourceFile(host, compFilePath);

        if (!compSource) {
            return;
        }

        const compMetadata = getComponentMetadata(compSource);

        if (!compMetadata) {
            return;
        }

        const templateNode = getMetadataProperty(compMetadata, 'template')?.getInitializer()?.asKind(SyntaxKind.StringLiteral);
        const templateUrlNode = getMetadataProperty(compMetadata, 'templateUrl')?.getInitializer()?.asKind(SyntaxKind.StringLiteral);

        if (templateNode) {
            templateNode.replaceWithText('<router-outlet></router-outlet>');
            host.overwrite(compPath, compSource.getFullText());
        } else if (templateUrlNode) {
            const templateUrl = templateUrlNode.getLiteralValue();
            const templatePath = join(dirname(compFilePath), templateUrl);
            host.overwrite(templatePath, '<router-outlet></router-outlet>')
        }
    }
}

// You don't have to export the function as default. You can also have more than one rule factory
// per file.
export default function (_options: Schema): Rule {
    return async (tree: Tree, _context: SchematicContext) => {
        if (!_options.version) {
            const [appTags, pkgTags] = await Promise.all([
                listNpmReleaseTags(_options.application === 'MES' ? MES_BASE_MODULE[0] : CORE_BASE_MODULE[0]),
                listNpmReleaseTags(`${pkgName}@${pkgVersion}`)
            ]);

            const valideTags = pkgTags.filter(t => appTags.includes(t)) // only include matching app package tags

            if (valideTags.length === 0) {
                throw new SchematicsException('There are no matching npm dist-tags for the current application');
            }

            const question: inquirer.ListQuestion = {
                type: 'list',
                name: 'distTag',
                message: 'What is the distribution to utilize?',
                choices: valideTags
            };

            _options.version = (await inquirer.prompt([question])).distTag;
        }

        if (!_options.version) {
            throw new SchematicsException('Option "version" is required.');
        }

        if (!_options.project) {
            throw new SchematicsException('Option "project" is required.');
        }

        const workspace = await readWorkspace(tree);
        const project = workspace.projects.get(_options.project);
        if (!project) {
            throw new SchematicsException(`Project is not defined in this workspace.`);
        }

        if (project.extensions['projectType'] !== 'application') {
            throw new SchematicsException(`HTMLStarter requires a project type of "application".`);
        }

        // Find all the relevant targets for the project
        if (project.targets.size === 0) {
            throw new SchematicsException(`Targets are not defined for this project.`);
        }

        const packjson = tree.readJson('package.json') as JsonObject;
        const allDeps = [...Object.keys(packjson.dependencies as JsonObject), ...Object.keys(packjson.devDependencies as JsonObject)];

        return chain([
            !allDeps.includes('@angular/service-worker') ? externalSchematic('@angular/pwa', 'pwa', { project: _options.project }) : noop(),
            externalSchematic('@angular/localize', 'ng-add', { project: _options.project, useAtRuntime: true }),
            _options.eslint ? externalSchematic('@angular-eslint/schematics', 'ng-add', {}) : noop(),
            installSchematics(_options as Required<typeof _options>)
        ]);
    };
}
