import { apply, applyTemplates, chain, externalSchematic, mergeWith, move, Rule, SchematicContext, SchematicsException, Tree, url } from '@angular-devkit/schematics';
import { NodePackageInstallTask } from '@angular-devkit/schematics/tasks';
import { getWorkspace, updateWorkspace } from '@schematics/angular/utility/workspace';
import { getAppModulePath } from '@schematics/angular/utility/ng-ast-utils';
import { isImported, insertImport, addSymbolToNgModuleMetadata, findNodes, getDecoratorMetadata, getSourceNodes, findNode } from '@schematics/angular/utility/ast-utils';
import { targetBuildNotFoundError } from '@schematics/angular/utility/project-targets';
import { BrowserBuilderOptions } from '@schematics/angular/utility/workspace-models';
import { addPackageJsonDependency, NodeDependency } from '@schematics/angular/utility/dependencies';
import * as ts from 'typescript';

import { Readable, Writable } from 'stream';
import { CORE_METADATA_MODULES, CORE_MODULE, CORE_PACKAGES, PROJECT_ASSETS, PROJECT_SCRIPTS, PROJECT_STYLES } from './package-configs';
import { applyToUpdateRecorder, Change, RemoveChange, ReplaceChange } from '@schematics/angular/utility/change';
import { JSONFile } from '@schematics/angular/utility/json-file';
import { posix } from 'path';
import { dirname, join, JsonObject, normalize } from '@angular-devkit/core';

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
    @import url("cmf.style.blue.css");
    @import url("cmf.style.blue.grey.css");
    @import url("cmf.style.dark.blue.css");
    @import url("cmf.style.light.blue.css");
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
 * Gets the a ts source file
 */
function getTsSourceFile(host: Tree, path: string): ts.SourceFile {
  const buffer = host.read(path);
  if (!buffer) {
    throw new SchematicsException(`Could not read file (${path}).`);
  }
  const content = buffer.toString();
  const source = ts.createSourceFile(path, content, ts.ScriptTarget.Latest, true);

  return source;
}

/**
 * Finds the parent node of a given type
 */
function findParentNode(node: ts.Node, kind: ts.SyntaxKind) {
  while (node && node.kind !== kind) {
    node = node.parent as ts.CallExpression;
  }
  return node ?? null;
}

/**
 * Updates main.ts file adding the load config method
 */
function installSchematics(_options: any) {
  return async (host: Tree, _context: SchematicContext) => {
    const workspace = await getWorkspace(host);
    const project = workspace.projects.get(_options.project);

    if (!project) {
      throw new SchematicsException(`Project is not defined in this workspace.`);
    }

    (workspace.extensions.cli as JsonObject)!.defaultCollection = '@criticalmanufacturing/ng-schematics'

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

    const buildOptions = ((buildTarget.options || {}) as unknown) as BrowserBuilderOptions;

    // Setup sources for the assets files to add to the project
    const sourcePath = project.sourceRoot ?? posix.join(project.root, 'src');

    const templateSource = apply(url('./files'), [
      applyTemplates({
        startupCulture: 'en-US',
        startupTheme: 'cmf.style.light.blue',
        supportedCultures: `[
      "en-US"
    ]`,
        supportedThemes: `[
      "cmf.style.light.blue",
      "cmf.style.dark.blue",
      "cmf.style.blue.grey",
      "cmf.style.blue"
    ]`
      }),
      move(posix.join(sourcePath, 'assets')),
    ]);

    return chain([
      updateWorkspace(workspace),
      emptyDir(posix.join(sourcePath, 'assets', 'icons')),
      mergeWith(templateSource),
      installDependencies(CORE_PACKAGES),
      ...[...indexFiles].map((path) => updateIndexFile(path)),
      overriteComponentTemplate(buildOptions.main),
      updateAppModule(buildOptions.main, [...CORE_METADATA_MODULES, CORE_MODULE]),
      updateMain(buildOptions.main),
      updateTsConfig({ "allowSyntheticDefaultImports": true })
    ]);
  };
}

/**
 * Updates main.ts file adding the load config method
 */
function updateMain(mainPath: string) {
  return (host: Tree, _context: SchematicContext) => {
    const mainBuffer = host.read(mainPath);
    if (!mainBuffer) {
      throw new SchematicsException(`Main file (${mainPath}) not found`);
    }
    const mainText = mainBuffer.toString('utf-8');
    const source = ts.createSourceFile(mainPath, mainText, ts.ScriptTarget.Latest, true);
    const bootstrapIdentifierNodes = findNodes(source, ts.SyntaxKind.Identifier)
      .filter((node) => node.getText() === 'bootstrapModule');

    for (const bootstrapIdentifier of bootstrapIdentifierNodes) {
      const bootstrapCallNode = findParentNode(bootstrapIdentifier, ts.SyntaxKind.CallExpression) as ts.CallExpression | null;

      if (!bootstrapCallNode) {
        continue;
      }

      const bootstrapExpressionNode = findParentNode(bootstrapCallNode, ts.SyntaxKind.ExpressionStatement) as ts.ExpressionStatement | null;

      if (!bootstrapExpressionNode) {
        continue;
      }

      const moduleIdentifier = bootstrapCallNode.arguments[0].getText();
      const appIdentifierNodes = findNodes(source, ts.SyntaxKind.Identifier)
        .filter((node) => node.getText() === moduleIdentifier);

      let bootstrapImport: ts.ImportDeclaration | null = null;
      for (const identifier of appIdentifierNodes) {
        bootstrapImport = findParentNode(identifier, ts.SyntaxKind.ImportDeclaration) as ts.ImportDeclaration | null;

        if (bootstrapImport) {
          break;
        }
      }

      if (!bootstrapImport) {
        continue;
      }

      const startPos = bootstrapCallNode.arguments[0].getStart() - bootstrapExpressionNode.getStart();
      const endPos = startPos + moduleIdentifier.length;
      const bootstrapInnerExpressionText = `${bootstrapExpressionNode.getText().substring(0, startPos)}m.${moduleIdentifier}${bootstrapExpressionNode.getText().substring(endPos)}`;
      const bootstrapExpression = `\
loadApplicationConfig('assets/config.json'/* , 'assets/messages' */).then(() => {
  import(/* webpackMode: "eager" */'./app/app.module').then((m) => {
    ${bootstrapInnerExpressionText.replace(/^(\r?\n)(\s*)/gm, (_, lineFeed, indentaion) => `${lineFeed}${indentaion}    `)}
  });
});`

      const changes: Change[] = [
        insertImport(source, mainPath, 'loadApplicationConfig', 'cmf-core'),
        new RemoveChange(mainPath, bootstrapImport.getFullStart(), bootstrapImport.getFullText()),
        new ReplaceChange(mainPath, bootstrapExpressionNode.getStart(), bootstrapExpressionNode.getText(), bootstrapExpression),
      ];

      const recorder = host.beginUpdate(mainPath);
      applyToUpdateRecorder(recorder, changes);
      host.commitUpdate(recorder);

      return host;
    }

    throw new SchematicsException('Bootstrap call not found');
  };
}

/**
 * Updates app module adding the desired package modules
 */
function updateAppModule(mainPath: string, pkgs: [string, string][]): Rule {
  return (host: Tree) => {
    const modulePath = getAppModulePath(host, mainPath);

    // add imports
    let moduleSource = getTsSourceFile(host, modulePath);
    const changes: Change[] = [];

    for (const [pkgName, moduleName] of pkgs) {
      if (!isImported(moduleSource, moduleName, pkgName)) {
        changes.push(
          insertImport(moduleSource, modulePath, moduleName, pkgName),
          ...addSymbolToNgModuleMetadata(moduleSource, modulePath, 'imports', moduleName)
        );
      }
    }

    if (changes) {
      const recorder = host.beginUpdate(modulePath);
      applyToUpdateRecorder(recorder, changes);
      host.commitUpdate(recorder);
    }

    return host;
  };
}

/**
 * Adds a set of packages to the package.json in the given host tree.
 */
function updateTsConfig(rules: Record<string, any>) {
  return (host: Tree) => {
    if (!host.exists('tsconfig.json')) {
      return host;
    }

    const file = new JSONFile(host, 'tsconfig.json');

    Object.keys(rules).forEach((rule) => {
      const jsonPath = ['compilerOptions', rule];
      const value = rules[rule];
      file.modify(jsonPath, value);
    });
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

function getMetadataProperty(metadata: ts.Node, propertyName: string): ts.PropertyAssignment {
  const properties = (metadata as ts.ObjectLiteralExpression).properties;
  const property = properties.filter(ts.isPropertyAssignment).filter((prop) => {
    const name = prop.name;
    switch (name.kind) {
      case ts.SyntaxKind.Identifier:
        return name.getText() === propertyName;
      case ts.SyntaxKind.StringLiteral:
        return name.text === propertyName;
    }

    return false;
  })[0];

  return property;
}

function getBootstrapComponentPath(host: Tree, mainPath: string): string {
  const modulePath = getAppModulePath(host, mainPath);
  const moduleSource = getTsSourceFile(host, modulePath);

  const metadataNode = getDecoratorMetadata(moduleSource, 'NgModule', '@angular/core')[0];
  const bootstrapProperty = getMetadataProperty(metadataNode, 'bootstrap');

  const arrLiteral = bootstrapProperty.initializer as ts.ArrayLiteralExpression;

  const componentSymbol = arrLiteral.elements[0].getText();

  const relativePath = getSourceNodes(moduleSource)
    .filter(ts.isImportDeclaration)
    .filter((imp) => {
      return findNode(imp, ts.SyntaxKind.Identifier, componentSymbol);
    })
    .map((imp) => {
      const pathStringLiteral = imp.moduleSpecifier as ts.StringLiteral;

      return pathStringLiteral.text;
    })[0];

  return join(dirname(normalize(modulePath)), relativePath + '.ts');
}

interface TemplateInfo {
  templateProp?: ts.PropertyAssignment;
  templateUrlProp?: ts.PropertyAssignment;
}

function getComponentTemplateInfo(host: Tree, componentPath: string): TemplateInfo {
  const compSource = getTsSourceFile(host, componentPath);
  const compMetadata = getDecoratorMetadata(compSource, 'Component', '@angular/core')[0];

  return {
    templateProp: getMetadataProperty(compMetadata, 'template'),
    templateUrlProp: getMetadataProperty(compMetadata, 'templateUrl'),
  };
}

function overriteComponentTemplate(mainPath: string) {
  return (host: Tree) => {
    const compPath = getBootstrapComponentPath(host, mainPath);
    const tmplInfo = getComponentTemplateInfo(host, compPath);

    if (tmplInfo.templateProp) {
      const change = new ReplaceChange(compPath, tmplInfo.templateProp.getStart(), tmplInfo.templateProp.getFullText(), '<router-outlet></router-outlet>');
      const recorder = host.beginUpdate(compPath);
      applyToUpdateRecorder(recorder, [change]);
      host.commitUpdate(recorder);
    } else if (tmplInfo.templateUrlProp) {
      const templateUrl = (tmplInfo.templateUrlProp.initializer as ts.StringLiteral).text;
      const dir = dirname(normalize(compPath));
      const templatePath = join(dir, templateUrl);
      host.overwrite(templatePath, '<router-outlet></router-outlet>')
    }
  }
}

// You don't have to export the function as default. You can also have more than one rule factory
// per file.
export default function (_options: any): Rule {
  return async (tree: Tree, _context: SchematicContext) => {
    const workspace = await getWorkspace(tree);

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
