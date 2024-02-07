import { Rule, SchematicsException, Tree, chain } from '@angular-devkit/schematics';
import {
  addToJsonArray,
  createSourceFile,
  getBuildTargets,
  getDefaultApplicationProject
} from '@criticalmanufacturing/schematics-devkit';
import { readWorkspace, writeWorkspace } from '@schematics/angular/utility';
import { PROJECT_POLYFILLS } from '../../ng-add/package-configs';
import parse from 'node-html-parser';
import { getAppModulePath, removeSymbolFromNgModuleMetadata } from '../../utility/ng-module';

/**
 * Updates the default project builder polyfills
 */
function updateAppPolyfills(options: { project: string }): Rule {
  return async (tree: Tree) => {
    const workspace = await readWorkspace(tree);
    const project = workspace.projects.get(options.project);

    // if there is no project defined, we are done.
    if (!project) {
      throw new SchematicsException(`Project "${options.project}" does not exist.`);
    }

    const buildTargets = getBuildTargets(project);

    // Configure project options
    for (const target of buildTargets) {
      // Add polyfills
      if (target.options?.polyfills instanceof Array) {
        addToJsonArray(target.options?.polyfills, [PROJECT_POLYFILLS[0]]);
      }
    }

    await writeWorkspace(tree, workspace);
  };
}

/**
 * Removes the themes node from the app index.html file
 */
function updateAppIndex(options: { project: string }): Rule {
  return async (tree: Tree) => {
    const workspace = await readWorkspace(tree);
    const project = workspace.projects.get(options.project);

    // if there is no project defined, we are done.
    if (!project) {
      throw new SchematicsException(`Project "${options.project}" does not exist.`);
    }

    const buildTargets = getBuildTargets(project);

    const indexFiles: string[] = [];

    for (const target of buildTargets) {
      if (typeof target.options?.index === 'string') {
        indexFiles.push(target.options.index);
      }

      if (!target.configurations) {
        continue;
      }

      for (const options of Object.values(target.configurations)) {
        if (typeof options?.index === 'string') {
          indexFiles.push(options.index);
        }
      }
    }

    for (const path of indexFiles) {
      const indexText = tree.readText(path);
      const index = parse(indexText, { comment: true });
      index.querySelector('head style#initial-theme')?.remove();

      tree.overwrite(path, index.toString());
    }
  };
}

function removeCoreModule(options: { project: string }): Rule {
  return async (tree: Tree) => {
    const modulePath = await getAppModulePath(tree, options.project);

    if (!modulePath) {
      return;
    }

    const appModule = createSourceFile(tree, modulePath);

    if (!appModule) {
      return;
    }

    removeSymbolFromNgModuleMetadata(appModule, 'imports', 'CoreModule');

    appModule.formatText();

    tree.overwrite(modulePath, appModule.getFullText());
  };
}

export default function (): Rule {
  return async (tree: Tree) => {
    const options = {
      project: await getDefaultApplicationProject(tree)
    };

    if (!options.project) {
      return;
    }

    return chain([
      updateAppPolyfills(options as { project: string }),
      updateAppIndex(options as { project: string }),
      removeCoreModule(options as { project: string })
    ]);
  };
}
