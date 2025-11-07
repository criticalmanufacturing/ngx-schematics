import { Rule, SchematicsException, Tree, chain } from '@angular-devkit/schematics';
import {
  createSourceFile,
  getBuildTargets,
  getDefaultApplicationProject,
  removeFromJsonArray
} from '@criticalmanufacturing/schematics-devkit';
import { readWorkspace, writeWorkspace } from '@schematics/angular/utility';
import { PROJECT_POLYFILLS } from '../../ng-add/package-configs';
import parse from 'node-html-parser';
import { getAppModulePath, removeSymbolFromNgModuleMetadata } from '../../utility/ng-module';
import { join, normalize } from '@angular-devkit/core';
import { updateAppBuildTarget } from '@criticalmanufacturing/schematics-devkit/rules';

export const FULL_CALENDAR = {
  bundleName: 'fullcalendar',
  inject: false,
  input: 'node_modules/fullcalendar/dist/fullcalendar.min.js'
};

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

    const indexFiles = new Set<string>();

    for (const target of buildTargets) {
      if (typeof target.options?.index === 'string') {
        indexFiles.add(target.options.index);
      } else if (!target.options?.index) {
        indexFiles.add(
          join(normalize(project.sourceRoot ?? join(normalize(project.root), 'src')), 'index.html')
        );
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

function updateAppScripts(options: { project: string }): Rule {
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
      if (target.options?.scripts instanceof Array) {
        removeFromJsonArray(target.options?.scripts, [FULL_CALENDAR]);
      }
    }

    await writeWorkspace(tree, workspace);
  };
}

export default function (): Rule {
  return async (tree: Tree) => {
    const project = await getDefaultApplicationProject(tree);

    if (!project) {
      return;
    }

    return chain([
      updateAppBuildTarget(project, [{ path: ['polyfills'], value: PROJECT_POLYFILLS }]),
      updateAppIndex({ project }),
      removeCoreModule({ project }),
      updateAppScripts({ project })
    ]);
  };
}
