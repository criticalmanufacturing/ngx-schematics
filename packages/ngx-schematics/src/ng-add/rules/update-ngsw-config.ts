import { JsonArray, JsonObject, join, normalize } from '@angular-devkit/core';
import { Rule, Tree } from '@angular-devkit/schematics';
import {
  addToJsonArray,
  ProjectType,
  removeFromJsonArray
} from '@criticalmanufacturing/schematics-devkit';
import { readWorkspace } from '@schematics/angular/utility';

function getAssetGroup(ngswConfig: JsonObject, name: string): JsonObject | undefined {
  return ((ngswConfig as JsonObject)['assetGroups'] as JsonArray).find(
    (assetGroup) => (assetGroup as JsonObject)['name'] === name
  ) as JsonObject;
}

function addAssets(assetGroup: JsonObject, assets: string[]): void {
  addToJsonArray((assetGroup?.['resources'] as JsonObject)?.['files'] as JsonArray, assets);
}

function removeAssets(assetGroup: JsonObject, assets: string[]): void {
  removeFromJsonArray((assetGroup?.['resources'] as JsonObject)?.['files'] as JsonArray, assets);
}

/**
 * Updates the ngsw-config.json
 * @param options options object containing the app project name
 */
export function updateNgswConfig(options: { project: string }): Rule {
  return async (tree: Tree) => {
    const workspace = await readWorkspace(tree);
    const project = workspace.projects.get(options.project);

    if (!project || project.extensions['projectType'] !== ProjectType.Application) {
      return;
    }

    const ngswConfigPath = join(normalize(project.root), 'ngsw-config.json');
    const ngswConfig = tree.readJson(ngswConfigPath) as JsonObject;

    const appAssetGroup = getAssetGroup(ngswConfig, 'app');
    const assetsAssetGroup = getAssetGroup(ngswConfig, 'assets');

    if (appAssetGroup) {
      addAssets(appAssetGroup, ['**/*.css', '**/*.js', '!/ngsw-loader-worker.js']);
      removeAssets(appAssetGroup, ['/*.css', '/*.js', '/index.html']);
    }

    if (assetsAssetGroup) {
      addAssets(assetsAssetGroup, ['/assets/**', '!/assets/config.json']);
    }

    ngswConfig['dataGroups'] ??= [];

    (ngswConfig['dataGroups'] as JsonArray).push({
      name: 'config',
      urls: ['/assets/config.json'],
      cacheConfig: {
        maxSize: 1,
        maxAge: '30d',
        strategy: 'freshness'
      }
    });

    ngswConfig['navigationRequestStrategy'] = 'freshness';

    tree.overwrite(ngswConfigPath, JSON.stringify(ngswConfig, undefined, 2));
  };
}
