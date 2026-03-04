import { JsonObject } from '@angular-devkit/core';
import { Rule, SchematicsException, Tree } from '@angular-devkit/schematics';
import { readWorkspace, writeWorkspace } from '@schematics/angular/utility';
import { exec } from 'node:child_process';
import { promisify } from 'node:util';
import ora from 'ora';
import { getBuildTargets } from '@criticalmanufacturing/schematics-devkit';

/**
 * Fetches the peer dependencies of a given npm package.
 * @param pkg The name of the npm package.
 * @returns A promise that resolves to an array of peer dependency names.
 */
export async function fetchPkgDependencies(pkg: string, version: string): Promise<string[]> {
  const spinner =
    process.env.NODE_ENV !== 'test'
      ? ora({
          text: `Fetching ${pkg} packages dependencies...`
        }).start()
      : null;

  try {
    const output = (
      await promisify(exec)(`npm view ${pkg}@${version} peerDependencies --json`, {
        encoding: 'utf8'
      })
    ).stdout;

    spinner?.stop();
    spinner?.succeed();

    if (output.trim() === '') {
      return [];
    }

    return Object.keys(JSON.parse(output) as Record<string, string>);
  } catch (err) {
    console.error(err);
    spinner?.stop();
    spinner?.fail('Failed to fetch package, see above.');
    throw new SchematicsException();
  }
}

/**
 * Updates the i18n extract configuration for a given project.
 * @param options The options for the update, including the project name and application type.
 * @returns A rule that updates the i18n extract configuration.
 */
export function updateI18nExtract(options: {
  project: string;
  version: string;
  application?: 'MES' | 'Core';
}): Rule {
  return async (tree: Tree) => {
    const workspace = await readWorkspace(tree);
    const projectDef = workspace.projects.get(options.project);

    if (!projectDef) {
      throw new SchematicsException(`Project ${options.project} not found in workspace.`);
    }

    if (!options.application) {
      const deps =
        ((tree.readJson('/package.json') as JsonObject)?.dependencies as JsonObject) ?? {};
      options.application = 'cmf-mes-ui' in deps ? 'MES' : 'Core';
    }

    const uiDepsPromise = [fetchPkgDependencies('cmf-core-ui', options.version)];
    if (options.application === 'MES') {
      uiDepsPromise.push(fetchPkgDependencies('cmf-mes-ui', options.version));
    }

    const uiDeps = (await Promise.all(uiDepsPromise))
      .flat()
      .filter((pkg) => pkg.startsWith('@criticalmanufacturing/') || pkg.startsWith('cmf-'))
      .sort();

    getBuildTargets(projectDef).forEach((target) => {
      target.configurations ??= {};
      target.configurations['i18n-extract'] ??= {};

      if (!(target.configurations['i18n-extract'].externalDependencies instanceof Array)) {
        target.configurations['i18n-extract'].externalDependencies = [];
      }

      const externalDeps = new Set([
        ...target.configurations['i18n-extract'].externalDependencies,
        ...uiDeps
      ]);

      target.configurations['i18n-extract'].externalDependencies = Array.from(externalDeps);
    });

    await writeWorkspace(tree, workspace);
  };
}
