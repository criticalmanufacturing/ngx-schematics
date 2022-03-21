import { extname, join, normalize } from '@angular-devkit/core';
import { ProjectDefinition } from '@angular-devkit/core/src/workspace';
import { chain, Rule, SchematicContext, SchematicsException, Tree } from '@angular-devkit/schematics';
import { findNodes } from '@schematics/angular/utility/ast-utils';
import { applyToUpdateRecorder } from '@schematics/angular/utility/change';
import { JSONFile } from '@schematics/angular/utility/json-file';
import { getWorkspace } from '@schematics/angular/utility/workspace';
import { basename } from 'path';
import ts = require('typescript');
import { findMetadataFile, insertPackageInfoMetadata, PackageInfo } from '../utility/metadata';


function getAllFiles(host: Tree, rootPath: string) {
  const rootDir = host.getDir(rootPath);

  const files = rootDir.subfiles
    .filter(file => extname(file) === '.ts' && file.split('.')[0] === basename(rootPath))
    .map((file) => join(normalize(rootPath), file));

  if (files.length === 0) {
    rootDir.subdirs.forEach((dir) => files.push(...getAllFiles(host, join(normalize(rootPath), dir))));;
  }

  return files;
}

function getMetadataPath(tree: Tree, rootDir: string) {
  if (!tree.exists(join(normalize(rootDir), 'metadata', 'ng-package.json'))) {
    return;
  }

  const json = new JSONFile(tree, join(normalize(rootDir), 'metadata', 'ng-package.json'));
  const entryFile = json.get(['lib', 'entryFile']) as string | null;

  if (!entryFile) {
    return;
  }

  const content = tree.get(join(normalize(rootDir), 'metadata', entryFile))?.content.toString('utf-8');

  if (!content) {
    return;
  }

  return findMetadataFile(content, entryFile, rootDir);
}


function fillMetadataPackageInfo(project: ProjectDefinition, options: PackageInfo): Rule {
  return (tree: Tree) => {
    const metadataPath = getMetadataPath(tree, project.root);

    if (!metadataPath) {
      return;
    }

    const changes = insertPackageInfoMetadata(tree.get(metadataPath)!.content.toString('utf-8'), metadataPath, options);

    if (!changes) {
      return;
    }

    const recorder = tree.beginUpdate(metadataPath);
    applyToUpdateRecorder(recorder, changes);
    tree.commitUpdate(recorder);
  }
}


export default function (_options: any): Rule {
  return async (tree: Tree, _context: SchematicContext) => {
    const workspace = await getWorkspace(tree);
    const project = workspace.projects.get(_options.project);

    if (!project) {
      throw new SchematicsException(`Project "${_options.project}" does not exist.`);
    }


    if (project.extensions['projectType'] !== 'library' || !project.sourceRoot) {
      return;
    }

    const packageInfo: PackageInfo = {
      package: _options.project,
      widgets: [],
      converters: [],
      dataSources: [],
      components: []
    }

    getAllFiles(tree, project.sourceRoot).forEach((file) => {
      const source = ts.createSourceFile(file, tree.get(file)!.content.toString('utf-8'), ts.ScriptTarget.Latest, true);

      const classNodes = findNodes(source, ts.isClassDeclaration);

      classNodes.forEach((node) => {
        if (!node.decorators || !node.name) {
          return
        }

        if (node.modifiers?.find((modifier) => modifier.kind === ts.SyntaxKind.AbstractKeyword)) {
          return;
        }

        const decorators = node.decorators
          .filter(node => node.expression.kind === ts.SyntaxKind.CallExpression)
          .map(node => node.expression as ts.CallExpression)
          .reduce((res, expr) => {
            if (expr.expression.kind == ts.SyntaxKind.Identifier) {
              res.push((expr.expression as ts.Identifier).text);
            } else if (expr.expression.kind == ts.SyntaxKind.PropertyAccessExpression) {
              // This covers foo.NgModule when importing * as foo.
              const paExpr = expr.expression as ts.PropertyAccessExpression;
              if (paExpr.expression.kind === ts.SyntaxKind.Identifier) {
                res.push(paExpr.name.text);
              }
            }

            return res;
          }, [] as string[]);

        if (decorators.includes('Widget')) {
          packageInfo.widgets.push(node.name.text);
        } else if (decorators.includes('DataSource')) {
          packageInfo.dataSources.push(node.name.text);
        } else if (decorators.includes('Converter')) {
          packageInfo.converters.push(node.name.text);
        } else if (decorators.includes('Component')) {
          packageInfo.components.push(node.name.text);
        }
      });
    });

    return chain([
      fillMetadataPackageInfo(project, packageInfo)
    ]);
  }
}