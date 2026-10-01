import { chain, Rule, Tree } from '@angular-devkit/schematics';
import { getDefaultApplicationProject } from '@criticalmanufacturing/schematics-devkit';
import { updateI18nExtract, updateJsonFile } from '@criticalmanufacturing/schematics-devkit/rules';
import { migrate as migrateSuperExpressions } from '@criticalmanufacturing/schematics-devkit/migrations/update-12-0-0-super';
import { migrate as migrateStandalone } from '@criticalmanufacturing/schematics-devkit/migrations/update-12-0-0-standalone';
import { updateThemesInConfigFile } from './themes-update';
import { updateAppSettings } from './configs-update';
import { addWorkers } from '../../ng-add/rules/add-workers';
import { updateActionButtonPlacement } from './action-button-update';
import { NGSW_WELL_KNOWN_CONFIG } from '../../ng-add/rules/update-ngsw-config';
import { join, normalize } from '@angular-devkit/core';

export default function (): Rule {
  return async (tree: Tree) => {
    const appProject = await getDefaultApplicationProject(tree);

    if (!appProject) {
      return;
    }

    const [project, definition] = appProject;

    return chain([
      updateThemesInConfigFile({ project }),
      updateAppSettings({ project }),
      migrateSuperExpressions({ path: './' }),
      migrateStandalone({ path: './' }),
      addWorkers({ project }),
      updateActionButtonPlacement({ path: './' }),
      updateI18nExtract({ project, version: '12.0.0-beta.2' }),
      updateJsonFile(join(normalize(definition.root), 'ngsw-config.json'), [
        { path: ['dataGroups'], value: [NGSW_WELL_KNOWN_CONFIG], operation: 'add' }
      ])
    ]);
  };
}
