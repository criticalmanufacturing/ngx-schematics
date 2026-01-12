import { Rule, Tree, chain } from '@angular-devkit/schematics';
import { SW_ASSETS, updateServiceWorker } from './update-service-worker';
import { getAppModulePath } from '../../utility/ng-module';
import {
  createSourceFile,
  getDefaultApplicationProject
} from '@criticalmanufacturing/schematics-devkit';
import { updateAppBuildTarget } from '@criticalmanufacturing/schematics-devkit/rules';

/**
 * Updates all application that are using the angular service worker to use the custom service worker
 */
function updateAppModuleServiceWorker(project: string): Rule {
  return async (tree: Tree) => {
    const appModulePath = await getAppModulePath(tree, project);

    if (!appModulePath) {
      return;
    }

    const source = createSourceFile(tree, appModulePath);

    if (!source) {
      return;
    }

    updateServiceWorker(source);

    source.formatText();

    tree.overwrite(appModulePath, source.getFullText());
  };
}

export default function (): Rule {
  return async (tree: Tree) => {
    const project = await getDefaultApplicationProject(tree);

    if (!project) {
      return;
    }

    return chain([
      updateAppBuildTarget(project, [{ path: ['assets'], value: SW_ASSETS }]),
      updateAppModuleServiceWorker(project)
    ]);
  };
}
