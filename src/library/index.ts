import { basename, dirname, join, normalize, strings } from '@angular-devkit/core';
import { apply, applyTemplates, chain, externalSchematic, mergeWith, move, noop, Rule, Tree, url } from '@angular-devkit/schematics';
import { getWorkspace } from '@schematics/angular/utility/workspace';
import { relativePathToWorkspaceRoot } from '@schematics/angular/utility/paths';
import { nameify } from '../utility/string';
import { JSONFile } from '@schematics/angular/utility/json-file';
import { findBootstrapModuleCall, findBootstrapModulePath } from '@schematics/angular/utility/ng-ast-utils';
import { BrowserBuilderOptions } from '@schematics/angular/utility/workspace-models';
import { getSourceNodes } from '@schematics/angular/utility/ast-utils';
import { addSymbolToNgModuleMetadata } from '../utility/ast';
import { classify } from '@angular-devkit/core/src/utils/strings';
import { applyToUpdateRecorder } from '@schematics/angular/utility/change';
import ts = require('@schematics/angular/third_party/github.com/Microsoft/TypeScript/lib/typescript');

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

function getAppModulePath(host: Tree, mainPath: string) {
  const mainText = host.read(mainPath)?.toString('utf-8');

  if (!mainText) {
    return;
  }

  const bootstrapCall = findBootstrapModuleCall(host, mainPath);

  if (!bootstrapCall) {
    return;
  }

  const bootstrapArg = bootstrapCall.arguments[0];
  const source = ts.createSourceFile(mainPath, mainText, ts.ScriptTarget.Latest, true);
  let moduleRelativePath: string | null = null;

  if (bootstrapArg.kind === ts.SyntaxKind.Identifier) {
    moduleRelativePath = findBootstrapModulePath(host, mainPath);
  } else if (bootstrapArg.kind === ts.SyntaxKind.PropertyAccessExpression) {
    const allNodes = getSourceNodes(source);
    moduleRelativePath = allNodes
      .filter(ts.isCallExpression)
      .filter(node => node.expression.getText() === 'import')
      .map(node => (node.arguments[0] as ts.StringLiteral).text)[0];
  }

  if (!moduleRelativePath) {
    return;
  }

  const mainDir = dirname(normalize(mainPath));
  const modulePath = normalize(`/${mainDir}/${moduleRelativePath}.ts`);

  return modulePath;
}

function updateAppModule(options: any) {
  return async (host: Tree) => {
    const workspace = await getWorkspace(host);
    const appProject = Array.from(workspace.projects.values()).find(project => project.extensions.projectType === 'application');

    if (!appProject) {
      return;
    }

    const mainPath = (appProject.targets.get('build')?.options as BrowserBuilderOptions | undefined)?.main;

    if (!mainPath) {
      return;
    }

    const modulePath = getAppModulePath(host, mainPath);

    if (!modulePath) {
      return;
    }

    const content = host.get(modulePath)?.content.toString('utf8');

    if (!content) {
      return;
    }

    const source = ts.createSourceFile(modulePath, content, ts.ScriptTarget.Latest, true);
    const recorder = host.beginUpdate(modulePath);
    applyToUpdateRecorder(recorder, addSymbolToNgModuleMetadata(
      source,
      modulePath,
      'imports',
      `${classify(options.namePrefix)}MetadataModule`,
      options.packageName,
      'CoreModule'
    ));
    host.commitUpdate(recorder);
  }
}

function createMetadataSubEntry(options: any) {
  return async (host: Tree) => {
    const workspace = await getWorkspace(host);
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
