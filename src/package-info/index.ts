import { extname, join, normalize } from '@angular-devkit/core';
import { indentBy } from '@angular-devkit/core/src/utils/literals';
import { ProjectDefinition } from '@angular-devkit/core/src/workspace';
import { chain, Rule, SchematicContext, SchematicsException, Tree } from '@angular-devkit/schematics';
import { findNode, findNodes, getSourceNodes, insertAfterLastOccurrence, insertImport } from '@schematics/angular/utility/ast-utils';
import { applyToUpdateRecorder, Change, InsertChange } from '@schematics/angular/utility/change';
import { JSONFile } from '@schematics/angular/utility/json-file';
import { getWorkspace } from '@schematics/angular/utility/workspace';
import ts = require('typescript');
import { findMetadataFile, updateSpaces } from '../utility/metadata';


function getAllFiles(host: Tree, rootPath: string) {
  const rootDir = host.getDir(rootPath);

  const files = rootDir.subfiles
    .filter(file => extname(file) === '.ts')
    .map((file) => join(normalize(rootPath), file));

  rootDir.subdirs.forEach((dir) => {
    files.push(...getAllFiles(host, join(normalize(rootPath), dir)))
  });

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

const WIDGETS = 'widgets';
const CONVERTERS = 'converters';
const DATA_SOURCES = 'dataSources';
const COMPONENTS = 'components';

interface PackageInfo {
  package: string;
  [WIDGETS]: string[];
  [CONVERTERS]: string[];
  [DATA_SOURCES]: string[];
  [COMPONENTS]: string[];
}

function fillMetadataPackageInfo(project: ProjectDefinition, options: PackageInfo): Rule {
  return (tree: Tree) => {
    const metadataPath = getMetadataPath(tree, project.root);

    if (!metadataPath) {
      return;
    }

    const source = ts.createSourceFile(metadataPath, tree.get(metadataPath)!.content.toString('utf-8'), ts.ScriptTarget.Latest, true);

    const metadataClassDeclaration = getSourceNodes(source)
      .filter(ts.isClassDeclaration)
      .filter(node => {
        if (!node.heritageClauses) {
          return false;
        }

        return node.heritageClauses.find((clause) =>
          clause.getChildAt(0).kind === ts.SyntaxKind.ExtendsKeyword
          && findNode(clause, ts.SyntaxKind.Identifier, 'PackageMetadata'));
      })[0];

    const allAccessors = findNodes(metadataClassDeclaration, ts.isGetAccessor);

    const packageInfoAccessor = allAccessors.find((accessor) =>
      accessor.getChildren().find(node => node.kind === ts.SyntaxKind.Identifier && node.getText() === 'packageInfo'));

    const contentNode = metadataClassDeclaration.getChildAt(metadataClassDeclaration.getChildren()
      .findIndex(node => node.kind === ts.SyntaxKind.OpenBraceToken) + 1);

    const spaces = contentNode.getFullText().match(/^(\r?\n)+(\s*)/)?.[2].length ?? 2;

    if (!packageInfoAccessor) {
      const toInsertSpaced = updateSpaces(spaces)`

  /**
   * Package Info
   */
  public override get packageInfo(): PackageInfo {
    return {
      name: '${options.package}',
      loader: () => import(
        /* webpackExports: [
${indentBy(10)`"${[
          ...options.widgets,
          ...options.dataSources,
          ...options.converters,
          ...options.components
        ].join(`",\n"`)}"`}
        ] */
        '${options.package}'),
      widgets: [
${indentBy(8)`'${options.widgets.join(`',\n'`)}'`}
      ],
      dataSources: [
${indentBy(8)`'${options.dataSources.join(`',\n'`)}'`}
      ],
      converters: [
${indentBy(8)`'${options.converters.join(`',\n'`)}'`}
      ],
      components: [
${indentBy(8)`'${options.components.join(`',\n'`)}'`}
      ]
    }
  }`;

      const fallbackPos = findNodes(contentNode, ts.SyntaxKind.Constructor, 1)[0]?.getEnd() ?? contentNode.getStart();
      const changes = [
        insertImport(source, metadataPath, 'PackageInfo', 'cmf-core'),
        insertAfterLastOccurrence(allAccessors, toInsertSpaced, metadataPath, fallbackPos, ts.SyntaxKind.GetAccessor)
      ];

      const recorder = tree.beginUpdate(metadataPath);
      applyToUpdateRecorder(recorder, changes);
      tree.commitUpdate(recorder);
      return;
    }

    const returnStatement = findNodes(packageInfoAccessor, ts.SyntaxKind.ReturnStatement, 1, true)[0];
    const addedTypes: string[] = [];
    const changes: Change[] = [];
    [WIDGETS, DATA_SOURCES, CONVERTERS, COMPONENTS].forEach((identifier) => {
      const property = findNode(returnStatement, ts.SyntaxKind.Identifier, identifier)?.parent;

      if (!property || property.kind !== ts.SyntaxKind.PropertyAssignment) {
        return;
      }

      const arrayExp = (property as ts.PropertyAssignment).initializer as ts.ArrayLiteralExpression;

      if (arrayExp.kind !== ts.SyntaxKind.ArrayLiteralExpression) {
        return;
      }

      const elementsToAdd: string[] = [];

      (options as any)[identifier].forEach((type: string) => {
        if (!arrayExp.elements.find((elem) => elem.kind === ts.SyntaxKind.StringLiteral && (elem as ts.StringLiteral).text === type)) {
          elementsToAdd.push(type);
        }
      });

      if (elementsToAdd.length === 0) {
        return;
      }

      const list = arrayExp.getChildAt(1);
      const lastChild = list.getChildAt(list.getChildCount() - 1);

      const toInsertSpaced = updateSpaces(spaces)`${lastChild && lastChild.kind !== ts.SyntaxKind.CommaToken ? ',' : ''}
${indentBy(8)`'${elementsToAdd.join(`',\n'`)}'`}${lastChild ? '' : `\n      `}`;

      changes.push(new InsertChange(metadataPath, lastChild?.getEnd() ?? arrayExp.getEnd() - 1, toInsertSpaced));

      addedTypes.push(...elementsToAdd);
    });

    const loader = findNode(returnStatement, ts.SyntaxKind.Identifier, 'loader')?.parent;

    const importExp = findNodes(loader!, ts.isCallExpression)
      .find(node => node.expression.getText() === 'import');

    if (!importExp) {
      return;
    }

    const ranges = ts.getLeadingCommentRanges(source.getFullText(), importExp.arguments[0].getFullStart());

    if (!ranges) {
      return;
    }

    ranges.forEach((range) => {
      const commentText = source.getFullText().slice(range.pos, range.end);
      const exports = /(webpackExports\s*:\s*\[)(.*?)\]/gms.exec(commentText);

      if (!exports) {
        return;
      }

      const insertPos = range.pos + exports.index + exports[1].length + exports[2]?.trimEnd().length ?? 0;
      const containsElements = exports[2] && exports[2].trim().length > 0;
      const toInsertSpaced = updateSpaces(spaces)`${containsElements && !exports[2].trimEnd().endsWith(',') ? ',' : ''}
${indentBy(10)`"${addedTypes.join(`",\n"`)}"`}${containsElements ? '' : `\n        `}`;

      changes.push(new InsertChange(metadataPath, insertPos, toInsertSpaced));
    });


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