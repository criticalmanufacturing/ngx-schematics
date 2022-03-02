import { dirname, extname, join, normalize, relative, strings } from "@angular-devkit/core";
import { apply, applyTemplates, chain, mergeWith, move, Rule, SchematicContext, SchematicsException, Tree, url } from "@angular-devkit/schematics";
import { buildDefaultPath, getWorkspace } from "@schematics/angular/utility/workspace";
import { parseName } from '@schematics/angular/utility/parse-name';
import * as inquirer from 'inquirer';
import { JSONFile } from "@schematics/angular/utility/json-file";
import { ProjectDefinition } from "@angular-devkit/core/src/workspace";
import { applyToUpdateRecorder, Change, InsertChange } from "@schematics/angular/utility/change";
import * as ts from "typescript";
import { findNode, findNodes, getSourceNodes, insertAfterLastOccurrence } from "@schematics/angular/utility/ast-utils";
import { indentBy } from "@angular-devkit/core/src/utils/literals";

const STRING_NAMEIFY_REGEXP_1 = /([a-z\d])([A-Z]+)/g;

function nameify(str: string) {
  return strings.camelize(str.replace(STRING_NAMEIFY_REGEXP_1, '$1 $2'));
}

function updateSpaces(spacesToUse: number) {
  return (strings: TemplateStringsArray, ...substitutions: any[]) => {
    return String.raw(strings, ...substitutions).replace(/^([ \t]+)/gm, (_, match: string) => {
      const spaces = match.split('').reduce((res, char) => res += char === ' ' ? 1 : 2, 0)
      return `${' '.repeat(spaces / 2 * spacesToUse)}`;
    });
  };
}

export function insertExport(
  source: ts.SourceFile,
  fileToEdit: string,
  symbolName: string,
  fileName: string,
  description?: string,
  isDefault = false
): Change {
  const rootNode = source;
  const allExports = findNodes(rootNode, ts.SyntaxKind.ExportDeclaration);
  const useStrict = findNodes(rootNode, ts.isStringLiteral).filter((n) => n.text === 'use strict');
  let fallbackPos = 0;
  if (useStrict.length > 0) {
    fallbackPos = useStrict[0].end;
  }

  const open = isDefault ? '' : '{ ';
  const close = isDefault ? '' : ' }';
  // if there are no imports or 'use strict' statement, insert import at beginning of file
  const insertAtBeginning = allExports.length === 0;
  const separator = insertAtBeginning ? '' : ';\n';
  const toInsert = `${separator}${description ? '\n// ' + description + '\n' : ''}`
    + `export ${open}${symbolName}${close} from '${fileName}'${insertAtBeginning ? ';\n' : ''}`;

  return insertAfterLastOccurrence(
    allExports,
    toInsert,
    fileToEdit,
    fallbackPos,
    ts.SyntaxKind.StringLiteral,
  );
}

function updatePublicAPI(project: ProjectDefinition, entityType: string): Rule {
  return async (tree: Tree) => {
    if (tree.exists(join(normalize(project.root), 'ng-package.json'))) {
      const json = new JSONFile(tree, join(normalize(project.root), 'ng-package.json'));
      const entryFile = json.get(['lib', 'entryFile']) as string | null;

      if (entryFile) {
        const entryDir = join(tree.root.path, dirname(join(normalize(project.root), entryFile)));
        const filesToImport = tree.actions
          .filter(action => action.kind === "c" && extname(action.path) === '.ts')
          .map((action) => ({ relativePath: relative(entryDir, action.path), path: action.path }));

        const content = tree.get(join(normalize(project.root), entryFile))!.content.toString('utf-8');
        const source = ts.createSourceFile(join(normalize(project.root), entryFile), content, ts.ScriptTarget.Latest, true);

        const recorder = tree.beginUpdate(join(normalize(project.root), entryFile));
        const changes = filesToImport.map((file) =>
          insertExport(source, file.path, '*', file.relativePath.replace(extname(file.path), ''), `Wizard Create Edit ${nameify(entityType)}`, true));
        applyToUpdateRecorder(recorder, changes);
        tree.commitUpdate(recorder);
      }
    }
  }
}

function findMetadataFile(content: string, fileName: string) {
  const source = ts.createSourceFile(fileName, content, ts.ScriptTarget.Latest, true);
  const exportNodes = findNodes(source, ts.SyntaxKind.ExportDeclaration);

  for (const node of exportNodes) {
    const importFiles = node.getChildren()
      .filter(ts.isLiteralExpression)
      .filter((n) => n.text.endsWith('metadata.service'));

    if (importFiles.length === 1) {
      return importFiles[0].text;
    }
  }

  return null;
}

function insertActionMetadata(content: string, fileName: string, projectName: string, entityName: string) {
  const source = ts.createSourceFile(fileName, content, ts.ScriptTarget.Latest, true);

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

  const allAccessors = findNodes(metadataClassDeclaration, ts.SyntaxKind.GetAccessor);

  const actions = allAccessors.find((accessor) =>
    accessor.getChildren().find(node => node.kind === ts.SyntaxKind.Identifier && node.getText() === 'actions'));

  const contentNode = metadataClassDeclaration.getChildAt(metadataClassDeclaration.getChildren()
    .findIndex(node => node.kind === ts.SyntaxKind.OpenBraceToken) + 1);

  const spaces = contentNode.getFullText().match(/^(\r?\n)+(\s*)/)?.[2].length ?? 2;

  const actionCreateToInsert = `\
{
  id: '${strings.classify(entityName)}.Create',
  mode: ActionMode.ModalPage,
  loadComponent: () => import(
    /* webpackExports: "WizardCreateEdit${strings.classify(entityName)}" */
    '${projectName}').then(m => m.WizardCreateEdit${strings.classify(entityName)}),
  context: {
    editMode: 1 // mode: EditMode.Create
  }
}`;

  const actionEditToInsert = `\
{
  id: '${strings.classify(entityName)}.Edit',
  mode: ActionMode.ModalPage,
  loadComponent: () => import(
    /* webpackExports: "WizardCreateEdit${strings.classify(entityName)}" */
    '${projectName}').then(m => m.WizardCreateEdit${strings.classify(entityName)}),
  context: {
    editMode: 3 // mode: EditMode.Edit
  }
}`;

  if (!actions) {
    const toInsert = updateSpaces(spaces)`

  /**
   * Actions
   */
  public override get actions(): Action[] {
    return [
${indentBy(6)`${actionCreateToInsert}`},
${indentBy(6)`${actionEditToInsert}`}
    ];
  }`;

    const fallbackPos = findNodes(contentNode, ts.SyntaxKind.Constructor, 1)[0]?.getEnd() ?? contentNode.getStart();

    return insertAfterLastOccurrence(
      allAccessors,
      toInsert,
      fileName,
      fallbackPos,
      ts.SyntaxKind.GetAccessor
    );
  }

  const returnStatement = findNodes(actions, ts.SyntaxKind.ReturnStatement, 1, true)[0];
  const array = findNodes(returnStatement, ts.SyntaxKind.ArrayLiteralExpression, 1, true)[0];
  const list = array.getChildAt(1);

  const lastChild = list.getChildAt(list.getChildCount() - 1);

  const toInsert = updateSpaces(spaces)`${lastChild && lastChild.kind !== ts.SyntaxKind.CommaToken ? ',' : ''}
${indentBy(6)`${actionCreateToInsert}`},
${indentBy(6)`${actionEditToInsert}`}${lastChild ? '' : `\n    ` }`;

  return new InsertChange(fileName, lastChild?.getEnd() ?? array.getEnd() - 1, toInsert);
}

function updateMetadata(project: ProjectDefinition, projectName: string, entityType: string): Rule {
  return async (tree: Tree) => {
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

    const metadataRelPath = findMetadataFile(content, entryFile);

    if (!metadataRelPath) {
      return;
    }

    const metadataPath = join(dirname(join(normalize(project.root), 'metadata', entryFile)), metadataRelPath) + '.ts';
    const metadataContent = tree.get(metadataPath)?.content.toString('utf-8');

    if (!metadataContent) {
      return;
    }

    const recorder = tree.beginUpdate(metadataPath);
    applyToUpdateRecorder(recorder, [insertActionMetadata(metadataContent, metadataPath, projectName, entityType)]);
    tree.commitUpdate(recorder);
  };
}

export default function (_options: any): Rule {
  return async (tree: Tree, _context: SchematicContext) => {
    if (!_options.namespace) {
      const question: inquirer.ListQuestion = {
        type: "list",
        name: 'namespace',
        message: 'What is the business objects namespace of the entity type?',
        choices: ['Foundation', 'Navigo', 'Other (specify)']
      };

      _options.namespace = (await inquirer.prompt([question])).namespace;

      if ((_options.namespace as string).startsWith('Other')) {
        const question: inquirer.InputQuestion = {
          type: "input",
          name: 'namespace',
          message: 'Namespace'
        };

        _options.namespace = (await inquirer.prompt([question])).namespace;
      }
    }

    if (!_options.namespace) {
      throw new SchematicsException(`Entity Type mamespace is required`);
    }

    const workspace = await getWorkspace(tree);
    const project = workspace.projects.get(_options.project as string);

    if (!project) {
      throw new SchematicsException(`Project "${_options.project}" does not exist.`);
    }

    if (_options.path === undefined) {
      _options.path = buildDefaultPath(project);
    }

    const parsedPath = parseName(_options.path as string, _options.name);
    _options.name = parsedPath.name;
    _options.path = parsedPath.path;

    const templateSource = apply(url('./files'), [
      applyTemplates({
        ...strings,
        ..._options,
        nameify,
        project: project && project.prefix || _options.project
      }),
      move(parsedPath.path),
    ]);

    return chain([
      mergeWith(templateSource),
      updatePublicAPI(project, _options.name),
      updateMetadata(project, _options.project, _options.name)
    ]);
  }
}
