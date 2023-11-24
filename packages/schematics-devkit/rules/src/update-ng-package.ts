import { join, normalize } from '@angular-devkit/core';
import { Rule, Tree } from '@angular-devkit/schematics';
import { readWorkspace } from '@schematics/angular/utility';
import { JSONFile } from '@criticalmanufacturing/schematics-devkit';

/**
 * Update the ng-package.json file of the new project
 */
export function updateNgPackageJson(options: { name: string }): Rule {
  return async (tree: Tree) => {
    const workspace = await readWorkspace(tree);
    const project = workspace.projects.get(options.name);

    if (!project) {
      return;
    }

    const folderName = normalize(project.root);
    const ngPackagePath = join(folderName, 'ng-package.json');

    if (!tree.exists(ngPackagePath)) {
      return;
    }

    new JSONFile(tree, ngPackagePath).modify(['deleteDestPath'], false);
  };
}
