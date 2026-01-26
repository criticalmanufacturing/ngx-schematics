import { chain, Rule, Tree } from '@angular-devkit/schematics';
import { getDefaultApplicationProject } from '@criticalmanufacturing/schematics-devkit';
import { migrate as migrateSuperExpressions } from '@criticalmanufacturing/schematics-devkit/migrations/update-12-0-0-super';
import { migrate as migrateStandalone } from '@criticalmanufacturing/schematics-devkit/migrations/update-12-0-0-standalone';
import { updateThemesInConfigFile } from './themes-update';
import { updateAppSettings } from './configs-update';
import { addWorkers } from '../../ng-add/rules/add-workers';

export default function (): Rule {
  return async (tree: Tree) => {
    const project = await getDefaultApplicationProject(tree);

    if (!project) {
      return;
    }

    return chain([
      updateThemesInConfigFile({ project }),
      updateAppSettings({ project }),
      migrateSuperExpressions({ path: './' }),
      migrateStandalone({ path: './' }),
      addWorkers({ project })
    ]);
  };
}
