import { join, JsonArray, JsonObject, normalize } from '@angular-devkit/core';
import { chain, Rule, SchematicsException, Tree } from '@angular-devkit/schematics';
import {
  getDefaultApplicationProject,
  removeFromJsonArray
} from '@criticalmanufacturing/schematics-devkit';
import { readWorkspace } from '@schematics/angular/utility';

function updateNgswConfig(options: { project: string }): Rule {
  return async (tree: Tree) => {
    const workspace = await readWorkspace(tree);
    const project = workspace.projects.get(options.project);

    // if there is no project defined, we are done.
    if (!project) {
      throw new SchematicsException(`Project "${options.project}" does not exist.`);
    }

    const ngswConfigPath = join(normalize(project.root), 'ngsw-config.json');
    const ngswConfig = tree.readJson(ngswConfigPath) as JsonObject;
    const appAssetGroup = ((ngswConfig)['assetGroups'] as JsonArray).find(
      (assetGroup) => (assetGroup as JsonObject)['name'] === 'app'
    ) as JsonObject;

    ngswConfig['navigationRequestStrategy'] = 'freshness';

    if (appAssetGroup) {
      removeFromJsonArray((appAssetGroup?.['resources'] as JsonObject)?.['files'] as JsonArray, [
        '/index.html'
      ]);
    }

    tree.overwrite(ngswConfigPath, JSON.stringify(ngswConfig, undefined, 2));
  };
}

export default function (): Rule {
  return async (tree: Tree) => {
    const project = await getDefaultApplicationProject(tree);

    if (!project) {
      return;
    }

    return chain([updateNgswConfig({ project })]);
  };
}
