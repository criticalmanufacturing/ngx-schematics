import { Tree } from '@angular-devkit/schematics';
import { SchematicTestRunner } from '@angular-devkit/schematics/testing';
import { LIBRARY_METADATA_ENTRY } from '@criticalmanufacturing/schematics-devkit';
import { AngularBuilder, readWorkspace } from '@schematics/angular/utility';
import { lastValueFrom } from 'rxjs';
import { registerLibraryEntryPoint } from './register-library-entry-point.js';

describe('registerLibraryEntryPoint', () => {
  it('registers the metadata entry point and its output path for ng-packagr', async () => {
    const runner = new SchematicTestRunner(
      '@criticalmanufacturing/schematics-devkit',
      require.resolve('../../migrations/collection.json')
    );
    const tree = Tree.empty();
    const projectName = 'example';
    const projectRoot = 'libs/example';
    const packageName = '@scope/example';

    tree.create(
      '/angular.json',
      JSON.stringify({
        version: 1,
        projects: {
          [projectName]: {
            root: projectRoot,
            projectType: 'library',
            // eslint-disable-next-line @typescript-eslint/no-deprecated -- Exercise the ng-packagr compatibility path.
            architect: { build: { builder: AngularBuilder.BuildNgPackagr } }
          }
        }
      })
    );
    tree.create('/tsconfig.json', '{}');
    tree.create(`${projectRoot}/package.json`, JSON.stringify({ name: packageName }));
    tree.create(`${projectRoot}/ng-package.json`, JSON.stringify({ dest: '../../build/custom' }));
    const workspace = await readWorkspace(tree);

    const result = await lastValueFrom(
      runner.callRule(
        registerLibraryEntryPoint({
          project: workspace.projects.get(projectName)!,
          projectName,
          ...LIBRARY_METADATA_ENTRY
        }),
        tree
      )
    );

    expect(result.readJson(`${projectRoot}/metadata/ng-package.json`)).toEqual({
      $schema: '../../../node_modules/ng-packagr/ng-package.schema.json',
      lib: { entryFile: 'src/public-api.ts' }
    });
    expect(result.readJson(`${projectRoot}/package.json`)).toEqual({ name: packageName });
    expect(result.readJson('/tsconfig.json')).toEqual({
      compilerOptions: { paths: { [`${packageName}/metadata`]: ['./build/custom/metadata'] } }
    });
  });
});
