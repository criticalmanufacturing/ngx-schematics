import { join, relative } from 'node:path';
import { Tree } from '@angular-devkit/schematics';
import { readWorkspace } from '@schematics/angular/utility';
import { Project, QuoteKind } from 'ts-morph';
import { RealFileSystemHost } from '@ts-morph/common';

/**
 * Creates a migration project by setting up a custom file system and adding source files.
 *
 * @param tree - The Angular schematic Tree object representing the file system.
 * @param options - An object containing the root directory and migration path.
 * @param options.rootDir - The root directory of the project.
 * @param options.migrationPath - The path where the migration should be applied.
 * @returns A Promise that resolves to a ts-morph Project instance.
 */
export async function createMigrationProject(
  tree: Tree,
  options: { rootDir: string; path: string }
): Promise<Project> {
  const { rootDir, path } = options;
  const fileSystem = new RealFileSystemHost();

  // override the native read file so the files are fetched from the tree
  // since they can contain pending changes
  const nativeReadFile = fileSystem.readFileSync;
  fileSystem.readFileSync = (filePath, encoding) => {
    const treePath = relative(rootDir, filePath);

    if (treePath.startsWith('..')) {
      return nativeReadFile(filePath, encoding);
    }

    return tree.readText(treePath);
  };

  const tsProject = new Project({
    fileSystem: fileSystem,
    manipulationSettings: { quoteKind: QuoteKind.Single }
  });

  const workspace = await readWorkspace(tree);

  // add all source files under the specified path
  workspace.projects.forEach((proj) => {
    const srcRoot = join(rootDir, proj.root);
    if (relative(path, srcRoot).startsWith('..') && relative(srcRoot, path).startsWith('..')) {
      return;
    }

    tsProject.addSourceFilesAtPaths(
      relative(path, srcRoot).startsWith('..') ? join(path, '**/*.ts') : join(srcRoot, '**/*.ts')
    );
  });

  return tsProject;
}
