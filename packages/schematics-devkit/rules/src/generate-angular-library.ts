import { JsonObject } from '@angular-devkit/core';
import { chain, externalSchematic, noop, Rule, Tree } from '@angular-devkit/schematics';
import { Schema as LibrarySchema } from '@schematics/angular/library/schema';
import { readWorkspace } from '@schematics/angular/utility';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';

/** Creates a library with the workspace CLI's schematic and adds lint configuration when enabled. */
export function generateAngularLibrary(options: LibrarySchema): Rule {
  return async (tree: Tree) => {
    const workspace = await readWorkspace(tree);
    const lint = ((workspace.extensions.cli as JsonObject)?.schematicCollections as string[])?.find(
      (collection) => ['@angular-eslint/schematics', 'angular-eslint'].includes(collection)
    );

    // The workspace CLI and this package can depend on different versions of @schematics/angular.
    const cliPackage = require.resolve('@angular/cli/package.json', { paths: [process.cwd()] });
    const schematicsPackage = createRequire(cliPackage).resolve('@schematics/angular/package.json');
    const collection = join(dirname(schematicsPackage), 'collection.json');

    return chain([
      externalSchematic(collection, 'library', options),
      lint ? externalSchematic(lint, 'add-eslint-to-project', { project: options.name }) : noop()
    ]);
  };
}
