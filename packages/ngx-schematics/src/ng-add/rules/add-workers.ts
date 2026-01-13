import { dirname, join, normalize, relative } from '@angular-devkit/core';
import {
  apply,
  applyTemplates,
  chain,
  mergeWith,
  move,
  Rule,
  Tree,
  url
} from '@angular-devkit/schematics';
import { createSourceFile } from '@criticalmanufacturing/schematics-devkit';
import { getAppConfigPath } from '../../utility/app-config';
import { getAppModulePath } from '../../utility/ng-module';

export function addWorkers(options: { project: string }): Rule {
  return async (tree: Tree) => {
    const [appConfigPath, appModulePath] = await Promise.all([
      getAppConfigPath(tree, options.project),
      getAppModulePath(tree, options.project)
    ]);

    const appRootPath = appConfigPath ?? appModulePath;

    if (!appRootPath) {
      return;
    }

    const appDir = dirname(normalize(appRootPath));
    const templateSource = apply(url(join(normalize(__dirname), '../files/app')), [
      applyTemplates({
        root: relative(appDir, normalize('/'))
      }),
      move(appDir)
    ]);

    const appFile = createSourceFile(tree, appRootPath);

    if (!appFile) {
      return;
    }

    appFile.addImportDeclaration({
      moduleSpecifier: './app.workers'
    });

    tree.overwrite(appRootPath, appFile.getFullText());

    return chain([mergeWith(templateSource)]);
  };
}
