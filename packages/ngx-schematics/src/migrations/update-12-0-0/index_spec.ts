import { JsonObject } from '@angular-devkit/core';
import { SchematicTestRunner, UnitTestTree } from '@angular-devkit/schematics/testing';

/**
 * Mock config.json file with gray theme included
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
    it('Should remove gray themes from config.json', async () => {
      // Add mock config.json to the app tree
      appTree.create('/application/src/assets/config.json', configJsonMock());

      // Run the migration
      const tree = await migrationsSchematicRunner.runSchematic('update-12-0-0', {}, appTree);

      // Read the updated config.json file
      const config = tree.readJson('/application/src/assets/config.json') as JsonObject;

      // The gray theme was removed from the supported themes array and should not be in the config anymore
      expect((config.general as JsonObject).supportedThemes).not.toContain('cmf.style.gray');
      expect((config.general as JsonObject).supportedThemes).not.toContain(
        'cmf.style.gray.accessibility'
      );
    });

    it('Update startup theme to cmf.style.blue when it was cmf.style.gray', async () => {
      // Add mock config.json to the app tree with startup theme set to gray
      appTree.create('/application/src/assets/config.json', configJsonMock('cmf.style.gray'));

      // Run the migration
      const tree = await migrationsSchematicRunner.runSchematic('update-12-0-0', {}, appTree);
      // Read the updated config.json file
      const config = tree.readJson('/application/src/assets/config.json') as JsonObject;

      // The startup theme was updated to cmf.style.blue
      expect(((config.general as JsonObject).startup as JsonObject).startupTheme).toBe(
        'cmf.style.blue'
      );
    });

    it('Update startup theme to cmf.style.blue.accessibility when it was cmf.style.gray.accessibility', async () => {
      // Add mock config.json to the app tree with startup theme set to gray accessibility
      appTree.create(
        '/application/src/assets/config.json',
        configJsonMock('cmf.style.gray.accessibility')
      );

      // Run the migration
      const tree = await migrationsSchematicRunner.runSchematic('update-12-0-0', {}, appTree);
      // Read the updated config.json file
      const config = tree.readJson('/application/src/assets/config.json') as JsonObject;

      // The startup theme was updated to cmf.style.blue.accessibility
      expect(((config.general as JsonObject).startup as JsonObject).startupTheme).toBe(
        'cmf.style.blue.accessibility'
      );
    });
  });
});
