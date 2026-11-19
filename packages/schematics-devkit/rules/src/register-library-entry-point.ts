import { join, normalize, relative } from '@angular-devkit/core';
import { Rule, SchematicsException, Tree } from '@angular-devkit/schematics';
import { ProjectDefinition } from '@schematics/angular/utility';
import { JSONFile, usesNgPackagr } from '@criticalmanufacturing/schematics-devkit';
import { updateTsConfig } from './update-tsconfig.js';

/**
 * Registers a library entry point and maps its import to the built output.
 * Uses the library's declared package name for the import path.
 * @param options Library and entry point details.
 * @param options.project Library project definition containing its root and build target.
 * @param options.projectName Workspace project name used to resolve the default output directory.
 * @param options.entryPoint Secondary entry point name such as `metadata`, or `.` for the primary entry point.
 * @param options.entryFile Path to the TypeScript source file relative to the library root, starting with `./`.
 * @param options.skipTsConfig Skip adding the entry point path mapping to the workspace tsconfig.
 */
export function registerLibraryEntryPoint(options: {
  project: ProjectDefinition;
  projectName: string;
  entryPoint: string;
  entryFile: string;
  skipTsConfig?: boolean;
}): Rule {
  return (tree: Tree) => {
    const { project, projectName, entryPoint, entryFile, skipTsConfig } = options;
    const isPrimary = entryPoint === '.';
    const workspaceRoot = normalize('/');
    const projectRoot = join(workspaceRoot, project.root);
    const packagePath = join(projectRoot, 'package.json');
    const packageJson = new JSONFile(tree, packagePath);
    const packageName = packageJson.get(['name']);
    if (typeof packageName !== 'string' || !packageName) {
      throw new SchematicsException(
        `The library package manifest at "${packagePath}" must define a name.`
      );
    }

    const outputPath = project.targets.get('build')?.options?.['outputPath'];
    let distRoot = typeof outputPath === 'string' ? outputPath : `dist/${projectName}`;

    if (usesNgPackagr(project)) {
      const entryRoot = join(projectRoot, entryPoint);
      const ngPackagePath = join(entryRoot, 'ng-package.json');
      const source = relative(entryRoot, join(projectRoot, entryFile));

      if (tree.exists(ngPackagePath)) {
        new JSONFile(tree, ngPackagePath).modify(['lib', 'entryFile'], source);
      } else {
        const schema = join(workspaceRoot, 'node_modules/ng-packagr/ng-package.schema.json');
        const ngPackage = { $schema: relative(entryRoot, schema), lib: { entryFile: source } };
        tree.create(ngPackagePath, JSON.stringify(ngPackage, null, 2) + '\n');
      }

      const dest = new JSONFile(tree, join(projectRoot, 'ng-package.json')).get(['dest']);
      distRoot = relative(
        workspaceRoot,
        join(projectRoot, typeof dest === 'string' ? dest : 'dist')
      );
    } else {
      packageJson.modify(['exports', isPrimary ? '.' : `./${entryPoint}`], entryFile);
    }

    if (skipTsConfig) {
      return;
    }

    const importPath = isPrimary ? packageName : `${packageName}/${entryPoint}`;
    return updateTsConfig([
      {
        path: ['compilerOptions', 'paths', importPath],
        value: [`./${join(normalize(distRoot), entryPoint)}`],
        operation: 'add'
      }
    ]);
  };
}
