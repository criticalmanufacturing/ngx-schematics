import { chain, Rule, Tree } from '@angular-devkit/schematics';
import { getDefaultApplicationProject } from '@criticalmanufacturing/schematics-devkit';
import { updateThemesInConfigFile } from './themes-update';
import { updateAppSettings } from './configs-update';

export default function (): Rule {
  return async (tree: Tree) => {
    const project = await getDefaultApplicationProject(tree);

    if (!project) {
      return;
    }

    return chain([updateThemesInConfigFile({ project }), updateAppSettings()]);
  };
}
