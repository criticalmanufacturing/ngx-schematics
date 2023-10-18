import { Rule, Tree, chain } from '@angular-devkit/schematics';
import { SW_ASSETS, updateServiceWorker } from './update-service-worker';
import { getAppModulePath } from '../../utility/ng-module';
import {
  createSourceFile,
  getDefaultApplicationProject
} from '@criticalmanufacturing/schematics-devkit';
import { addApplicationAssets } from '@criticalmanufacturing/schematics-devkit/rules';

/**
 * Updates all aplications that are using the angular service worker to use the custom service worker
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
      addApplicationAssets({ project, assets: SW_ASSETS }),
      updateAppModuleServiceWorker(project)
    ]);
  };
}
