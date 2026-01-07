import { deepCopy, JsonArray, JsonObject } from '@angular-devkit/core';
import { SchematicTestRunner, UnitTestTree } from '@angular-devkit/schematics/testing';
import { readWorkspace, writeWorkspace } from '@schematics/angular/utility';
import { getBuildTargets } from '@criticalmanufacturing/schematics-devkit';
import { NEW_THEMES, OLD_THEMES } from './themes-update';
import { PROJECT_LOADER } from '../../ng-add/package-configs';

/**
 * Mock config.json file with blue and gray themes included
 * @param startupTheme The startup theme to be used. Default is "cmf.style.blue"
 * @returns A string representation of the config.json file
 */
const configJsonMock = (startupTheme = 'cmf.style.blue') => `\
{
  "general": {
    "supportedThemes": [
      "cmf.style.blue",
      "cmf.style.blue.accessibility",
      "cmf.style.dark",
      "cmf.style.dark.accessibility",
      "cmf.style.gray",
      "cmf.style.gray.accessibility",
      "cmf.style.contrast",
      "cmf.style.contrast.accessibility"
    ],
    "startup": {
      "startupTheme": "${startupTheme}"
    }
  }
}
`;

describe('Test ng-update', () => {
  const migrationsSchematicRunner = new SchematicTestRunner(
    '@criticalmanufacturing/ngx-schematics',
    require.resolve('../../migrations.json')
  );

  const workspaceOptions = {
    name: 'workspace',
    version: '11.0.0'
  };

  const appOptions = {
    name: 'application',
    inlineStyle: false,
    inlineTemplate: false,
    routing: false,
    skipTests: false,
    skipPackageJson: false,
    standalone: false
  };

  let appTree: UnitTestTree;

  // Define test cases for startup theme updates
  const startupThemeCases = [
    { input: 'cmf.style.blue', expected: 'cmf.style.light' },
    { input: 'cmf.style.blue.accessibility', expected: 'cmf.style.light.accessibility' },
    { input: 'cmf.style.gray', expected: 'cmf.style.light' },
    { input: 'cmf.style.gray.accessibility', expected: 'cmf.style.light.accessibility' },
    { input: 'cmf.style.dark', expected: 'cmf.style.dark' },
    { input: 'cmf.style.dark.accessibility', expected: 'cmf.style.dark.accessibility' },
    { input: 'cmf.style.contrast', expected: 'cmf.style.contrast' },
    { input: 'cmf.style.contrast.accessibility', expected: 'cmf.style.contrast.accessibility' }
  ];

  beforeEach(async () => {
    appTree = await migrationsSchematicRunner.runExternalSchematic(
      '@schematics/angular',
      'workspace',
      workspaceOptions
    );

    appTree = await migrationsSchematicRunner.runExternalSchematic(
      '@schematics/angular',
      'application',
      appOptions,
      appTree
    );
  });

  describe('- Migrate to v12.0', () => {
    it('Should remove gray and blue themes from config.json and add the light theme', async () => {
      // Add mock config.json to the app tree
      appTree.create('/application/src/assets/config.json', configJsonMock());

      // Run the migration
      const tree = await migrationsSchematicRunner.runSchematic('update-12-0-0', {}, appTree);

      // Read the updated config.json file
      const config = tree.readJson('/application/src/assets/config.json') as JsonObject;

      // The gray and blue themes were removed from the supported themes array and should not be in the config anymore
      expect((config.general as JsonObject).supportedThemes).not.toContain('cmf.style.gray');
      expect((config.general as JsonObject).supportedThemes).not.toContain('cmf.style.blue');
      expect((config.general as JsonObject).supportedThemes).not.toContain(
        'cmf.style.gray.accessibility'
      );
      expect((config.general as JsonObject).supportedThemes).not.toContain(
        'cmf.style.blue.accessibility'
      );

      // The light theme was added to the supported themes array
      expect((config.general as JsonObject).supportedThemes).toContain('cmf.style.light');
      expect((config.general as JsonObject).supportedThemes).toContain(
        'cmf.style.light.accessibility'
      );
    });

    // Test if the startup theme is updated correctly
    startupThemeCases.forEach(({ input, expected }) => {
      it(`Update startup theme to ${expected} when it was ${input}`, async () => {
        // Add mock config.json to the app tree with startup theme set to gray
        appTree.create('/application/src/assets/config.json', configJsonMock(input));

        // Run the migration
        const tree = await migrationsSchematicRunner.runSchematic('update-12-0-0', {}, appTree);
        // Read the updated config.json file
        const config = tree.readJson('/application/src/assets/config.json') as JsonObject;

        // The startup theme was updated
        expect(((config.general as JsonObject).startup as JsonObject).startupTheme).toBe(expected);
      });
    });

    it('Should remove gray and blue themes from angular.json and add the light theme', async () => {
      let workspace = await readWorkspace(appTree);
      let targets = getBuildTargets(workspace.projects.get('application')!);

      const oldThemes = OLD_THEMES.map((theme) => ({
        inject: false,
        bundleName: theme,
        input: `node_modules/cmf-mes/assets/style/themes/${theme}/${theme}.less`
      }));

      const newThemes = NEW_THEMES.map((theme) => ({
        inject: false,
        bundleName: theme,
        input: `node_modules/cmf-mes/assets/style/themes/${theme}/${theme}.less`
      }));

      (targets[0].options!.styles as JsonArray).push(...oldThemes);

      await writeWorkspace(appTree, workspace);

      // Run the migration
      const tree = await migrationsSchematicRunner.runSchematic('update-12-0-0', {}, appTree);

      workspace = await readWorkspace(tree);
      targets = getBuildTargets(workspace.projects.get('application')!);

      const actual = deepCopy(targets[0].options!.styles);

      expect(actual).not.toEqual(jasmine.arrayContaining(oldThemes));
      expect(actual).toEqual(jasmine.arrayContaining(newThemes));
    });

    it('should update the application builder outputPath', async () => {
      const tree = await migrationsSchematicRunner.runSchematic('update-12-0-0', {}, appTree);

      const angularJsonContent = JSON.parse(tree.readContent('/angular.json'));
      expect(angularJsonContent.projects.application.architect.build.options.loader).toEqual(
        PROJECT_LOADER
      );
    });

    it('should have the necessary files', async () => {
      const tree = await migrationsSchematicRunner.runSchematic('update-12-0-0', {}, appTree);

      expect(tree.files).toEqual(jasmine.arrayContaining(['/application/src/app/app.workers.ts']));
    });
  });
});
