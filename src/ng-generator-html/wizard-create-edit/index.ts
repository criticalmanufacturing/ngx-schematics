import { dirname, extname, join, normalize, strings } from "@angular-devkit/core";
import { apply, applyTemplates, chain, mergeWith, move, Rule, SchematicContext, SchematicsException, Tree, url } from "@angular-devkit/schematics";
import { buildDefaultPath, getWorkspace } from "@schematics/angular/utility/workspace";
import { parseName } from '@schematics/angular/utility/parse-name';
import * as inquirer from 'inquirer';
import { JSONFile } from "@schematics/angular/utility/json-file";
import { ProjectDefinition } from "@angular-devkit/core/src/workspace";
import { applyToUpdateRecorder } from "@schematics/angular/utility/change";
import * as ts from "typescript";
import { insertExport } from "../utility/ast-uil";
import { buildRelativePath, nameify } from "../utility/string-util";
import { findMetadataFile, insertMetadata } from "../utility/metadata-util";


function updatePublicAPI(project: ProjectDefinition, entityType: string): Rule {
  return async (tree: Tree) => {
    if (tree.exists(join(normalize(project.root), 'ng-package.json'))) {
      const json = new JSONFile(tree, join(normalize(project.root), 'ng-package.json'));
      const entryFile = json.get(['lib', 'entryFile']) as string | null;

      if (entryFile) {
        const entryDir = join(tree.root.path, dirname(join(normalize(project.root), entryFile)));
        const filesToImport = tree.actions
          .filter(action => action.kind === "c" && extname(action.path) === '.ts')
          .map((action) => ({ relativePath: buildRelativePath(entryDir, action.path), path: action.path }));

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

function insertActionMetadata(content: string, fileName: string, projectName: string, entityName: string) {
  const actionsToInsert = `\
{
  id: '${strings.classify(entityName)}.Create',
  mode: ActionMode.ModalPage,
  loadComponent: () => import(
    /* webpackExports: "WizardCreateEdit${strings.classify(entityName)}" */
    '${projectName}').then(m => m.WizardCreateEdit${strings.classify(entityName)}),
  context: {
    editMode: 1 // mode: EditMode.Create
  }
},
{
  id: '${strings.classify(entityName)}.Edit',
  mode: ActionMode.ModalPage,
  loadComponent: () => import(
    /* webpackExports: "WizardCreateEdit${strings.classify(entityName)}Component" */
    '${projectName}').then(m => m.WizardCreateEdit${strings.classify(entityName)}Component),
  context: {
    editMode: 3 // mode: EditMode.Edit
  }
}`;

  return insertMetadata(
    content,
    fileName,
    {
      'ActionMode': 'cmf-core',
      'Action': 'cmf-core'
    },
    'actions',
    'Action[]',
    'Actions',
    actionsToInsert
  );
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

    const metadataPath = findMetadataFile(content, entryFile, project.root);

    if (!metadataPath) {
      return;
    }

    const metadataContent = tree.get(metadataPath)?.content.toString('utf-8');

    if (!metadataContent) {
      return;
    }

    const recorder = tree.beginUpdate(metadataPath);
    applyToUpdateRecorder(recorder, insertActionMetadata(metadataContent, metadataPath, projectName, entityType));
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
        project: project?.prefix ?? _options.project
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
