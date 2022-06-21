import {
    apply,
    applyTemplates,
    chain,
    externalSchematic,
    mergeWith,
    move,
    Rule,
    SchematicContext,
    SchematicsException,
    Tree,
    url
} from '@angular-devkit/schematics';
import {
    dirname,
    join,
    JsonArray,
    JsonObject,
    normalize,
    strings
} from '@angular-devkit/core';
import { Readable, Writable } from 'stream';
import { posix } from 'path';
import { ObjectLiteralExpression, PropertyAssignment, SourceFile, SyntaxKind } from 'ts-morph';

import { NodePackageInstallTask } from '@angular-devkit/schematics/tasks';
import { readWorkspace, writeWorkspace } from '@schematics/angular/utility';

import { targetBuildNotFoundError } from '@schematics/angular/utility/project-targets';
import { addPackageJsonDependency, NodeDependency } from '@schematics/angular/utility/dependencies';

import {
    CORE_BASE_MODULE,
    MES_BASE_MODULE,
    PACKAGES,
    PROJECT_ASSETS,
    PROJECT_SCRIPTS,
    PROJECT_STYLES
} from './package-configs';

import { getAppModulePath, getMainPath } from '../utility/workspace';
import { addSymbolToNgModuleMetadata, createSourceFile, insertImport } from '../utility/ast';
import { updateTsConfig } from '../utility/project';

/**
 * Updates index.html file with the themes and loading container
 */
function updateIndexFile(path: string): Rule {
    return async (tree: Tree) => {
        const buffer = tree.read(path);
        if (buffer === null) {
            throw new SchematicsException(`Could not read index file: ${path}`);
        }

        const rewriter = new (await import('parse5-html-rewriting-stream'));

        rewriter.on('startTag', (startTag) => {
            rewriter.emitStartTag(startTag);

            if (startTag.tagName === 'body') {
                rewriter.emitRaw(`
  <div id="loading-container" class="cmf-loading-container">
    <div class="cmf-loading-center">
      <div class="cmf-loading-cmf-logo"></div>
      <div class="cmf-loading-spinner"></div>
    </div>
  </div>`);
            }
        });

        rewriter.on('endTag', (endTag) => {


            if (endTag.tagName === 'head') {
                rewriter.emitRaw(`\
  <style id="initial-theme">
    @import url("cmf.style.blue.css") (prefers-color-scheme: light);
    @import url("cmf.style.dark.css") (prefers-color-scheme: dark);
  </style>
`);
            }

            rewriter.emitEndTag(endTag);
        });

        return new Promise<void>((resolve) => {
            const input = new Readable({
                encoding: 'utf8',
                read(): void {
                    this.push(buffer);
                    this.push(null);
                },
            });

            const chunks: Array<Buffer> = [];
            const output = new Writable({
                write(chunk: string | Buffer, encoding: BufferEncoding, callback: Function): void {
                    chunks.push(typeof chunk === 'string' ? Buffer.from(chunk, encoding) : chunk);
                    callback();
                },
                final(callback: (error?: Error) => void): void {
                    const full = Buffer.concat(chunks);
                    tree.overwrite(path, full.toString());
                    callback();
                    resolve();
                },
            });

            input.pipe(rewriter).pipe(output);
        });
    };
}


/**
 * Updates main.ts file adding the load config method
 */
function installSchematics(_options: any) {
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

        ((workspace.extensions.cli as JsonObject).schematicCollections as JsonArray).push('@criticalmanufacturing/ng-schematics');

        const buildTargets = [];
        const testTargets = [];

        for (const target of project.targets.values()) {
            if (target.builder === '@angular-devkit/build-angular:browser') {
                buildTargets.push(target);
            } else if (target.builder === '@angular-devkit/build-angular:karma') {
                testTargets.push(target);
            }
        }

        // Configure project options
        for (const target of buildTargets) {
            // Add assets
            if (target.options?.assets instanceof Array) {
                const index = target.options.assets.indexOf('src/favicon.ico');
                if (index >= 0) {
                    target.options.assets.splice(index, 1);
                    if (host.exists('src/favicon.ico')) {
                        host.delete('src/favicon.ico');
                    }
                }
                target.options.assets.push(...PROJECT_ASSETS);
            }

            // Add styles
            if (target.options?.styles instanceof Array) {
                target.options.styles.push(...PROJECT_STYLES);
            }

            // Add scripts
            if (target.options?.scripts instanceof Array) {
                target.options.scripts.push(...PROJECT_SCRIPTS);
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

        if (_options.registry) {
            host.create('.npmrc', `registry=${_options.registry}`);
        }

        const buildTarget = project.targets.get('build');
        if (!buildTarget) {
            throw targetBuildNotFoundError();
        }

        // Setup sources for the assets files to add to the project
        const sourcePath = project.sourceRoot ?? posix.join(project.root, 'src');

        const templateSource = apply(url('./files'), [
            applyTemplates({
                startupCulture: 'en-US',
                startupTheme: 'cmf.style.blue',
                supportedCultures: `[
      "en-US"
    ]`,
                supportedThemes: `[
      "cmf.style.blue",
      "cmf.style.dark",
      "cmf.style.grey"
    ]`
            }),
            move(posix.join(sourcePath, 'assets')),
        ]);

        await writeWorkspace(host, workspace);

        return chain([
            emptyDir(posix.join(sourcePath, 'assets', 'icons')),
            mergeWith(templateSource),
            installDependencies(PACKAGES),
            ...[...indexFiles].map((path) => updateIndexFile(path)),
            overriteComponentTemplate(),
            updateAppModule(PACKAGES),
            updateMain(),
            updateTsConfig({ 'compilerOptions.skipLibCheck': true })
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

        const bootstrapCall = source
            .getDescendantsOfKind(SyntaxKind.CallExpression)
            .find(node => node.getExpression().getText().endsWith('bootstrapModule'));


        if (!bootstrapCall) {
            return;
        }

        const bootstrapStatement = bootstrapCall.getFirstAncestorByKind(SyntaxKind.ExpressionStatement);

        if (!bootstrapStatement) {
            return;
        }

        const moduleIdentifier = bootstrapCall.getArguments()[0]?.getText();
        const bootstrapImport = source
            .getDescendantsOfKind(SyntaxKind.Identifier)
            .filter((node) => node.getText() === moduleIdentifier)
            .find(node => node.getFirstAncestorByKind(SyntaxKind.ImportDeclaration));

        bootstrapImport?.getFirstAncestorByKindOrThrow(SyntaxKind.ImportDeclaration).remove();
        bootstrapCall.getArguments()[0].replaceWithText(`m.${moduleIdentifier}`);
        bootstrapStatement.replaceWithText(`\
loadApplicationConfig('assets/config.json').then(() => {
    import(/* webpackMode: "eager" */'./app/app.module').then((m) => {
        ${bootstrapStatement.getText(true)}
    });
});`)

        insertImport(source, 'loadApplicationConfig', 'cmf-core');

        host.overwrite(mainPath, source.getFullText());
    };
}

/**
 * Updates app module adding the desired package modules
 */
function updateAppModule(pkgs: NodeDependency[]): Rule {
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

        // add core module first
        addSymbolToNgModuleMetadata(source, 'imports', CORE_BASE_MODULE[1], CORE_BASE_MODULE[0]);
        const baseModules = [CORE_BASE_MODULE[0], MES_BASE_MODULE[0]];

        // add other packages
        for (const pkg of pkgs) {
            if (pkg.name === CORE_BASE_MODULE[0]) {
                continue;
            }

            const hasMetadata = !baseModules.includes(pkg.name);
            const moduleName = strings.classify(pkg.name.substring(pkg.name.startsWith('cmf-') ? 4 : 0)) + (hasMetadata ? 'Metadata' : '') + 'Module';
            const modulePath = pkg.name + (hasMetadata ? '/metadata' : '');

            addSymbolToNgModuleMetadata(source, 'imports', moduleName, modulePath, CORE_BASE_MODULE[1]);
        }

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

function overriteComponentTemplate() {
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
export default function (_options: any): Rule {
    return async (tree: Tree, _context: SchematicContext) => {
        const workspace = await readWorkspace(tree);

        if (!_options.project) {
            throw new SchematicsException('Option "project" is required.');
        }

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

        const externalOptions = { project: _options.project };

        return chain([
            externalSchematic('@angular/pwa', 'pwa', externalOptions),
            externalSchematic('@angular/localize', 'ng-add', { externalOptions, useAtRuntime: true }),
            externalSchematic('@angular-eslint/schematics', 'ng-add', {}),
            installSchematics(_options)
        ]);
    };
}
