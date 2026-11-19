import { join, normalize } from '@angular-devkit/core';
import { chain, Rule, SchematicsException, Tree } from '@angular-devkit/schematics';
import { JSONFile, usesNgPackagr } from '@criticalmanufacturing/schematics-devkit';
import { AngularBuilder, readWorkspace, writeWorkspace } from '@schematics/angular/utility';
import {
  addDependency,
  DependencyType,
  getDependency,
  InstallBehavior
} from '@schematics/angular/utility/dependency';
import { latestVersions } from '@schematics/angular/utility/latest-versions';
import { updateTsConfig } from './update-tsconfig.js';

/**
 * Preserves existing library build output and adds any missing Less and Angular localization dependencies.
 * @param options Build and dependency options for the generated library.
 * @param options.name Library project name in the Angular workspace.
 * @param options.skipInstall Skip scheduling a package installation.
 * @param options.skipPackageJson Skip adding dependencies to the workspace package manifest.
 */
export function applyLibraryDefaultConfigs(options: {
  name: string;
  skipInstall?: boolean;
  skipPackageJson?: boolean;
}): Rule {
  return async (tree: Tree) => {
    const workspace = await readWorkspace(tree);
    const project = workspace.projects.get(options.name);
    const build = project?.targets.get('build');

    if (project && usesNgPackagr(project)) {
      const ngPackagePath = join(normalize(project.root), 'ng-package.json');
      new JSONFile(tree, ngPackagePath).modify(['deleteDestPath'], false);
    } else if (build?.builder === AngularBuilder.BuildLibrary && build.options) {
      build.options['deleteOutputPath'] = false;
      await writeWorkspace(tree, workspace);
    } else {
      throw new SchematicsException(
        `Project "${options.name}" is not configured with the Angular library builder.`
      );
    }

    if (options.skipPackageJson) {
      return;
    }

    const install = options.skipInstall ? InstallBehavior.None : InstallBehavior.Auto;
    const rules: Rule[] = [];
    if (!getDependency(tree, 'less')) {
      rules.push(
        addDependency('less', latestVersions['less'], { type: DependencyType.Dev, install })
      );
    }
    if (!getDependency(tree, '@angular/localize')) {
      const compiler =
        getDependency(tree, '@angular/compiler') ?? getDependency(tree, '@angular/compiler-cli');
      const version = compiler?.version ?? latestVersions.Angular;
      rules.push(addDependency('@angular/localize', version, { install }));
    }

    return chain(rules);
  };
}

/**
 * Adds type packages to `compilerOptions.types` in the library's tsconfig.
 * @param projectName Workspace project whose library tsconfig is updated.
 * @param types Type package names to include.
 */
export function addLibraryTsTypes(projectName: string, types: string[]): Rule {
  return updateTsConfig(
    [{ path: ['compilerOptions', 'types'], value: types, operation: 'add' }],
    projectName
  );
}
