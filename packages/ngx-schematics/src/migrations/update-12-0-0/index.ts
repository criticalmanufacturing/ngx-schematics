import { join, JsonArray, JsonObject, normalize } from '@angular-devkit/core';
import { chain, Rule, SchematicsException, Tree } from '@angular-devkit/schematics';
import {
  getDefaultApplicationProject,
  removeFromJsonArray
} from '@criticalmanufacturing/schematics-devkit';
import { readWorkspace } from '@schematics/angular/utility';

/**
 * Update themes in the application's assets/config.json.
 *
 * - Removes deprecated gray themes from "general.supportedThemes".
 * - Replaces deprecated startup themes:
 *   "cmf.style.gray" -> "cmf.style.blue"
 *   "cmf.style.gray.accessibility" -> "cmf.style.blue.accessibility"
 *
 * @param options The options for the schematic.
 * @returns A Rule that performs the update when applied to a Tree.
 */
function updateThemesInConfigFile(options: { project: string }): Rule {
  return async (tree: Tree) => {
    const workspace = await readWorkspace(tree);
    const project = workspace.projects.get(options.project);

    // If there is no project defined, we are done.
    if (!project) {
      throw new SchematicsException(`Project "${options.project}" does not exist.`);
    }

    // Get source path and config path.
    const sourcePath = project.sourceRoot ?? join(normalize(project.root), 'src');
    const configPath = join(normalize(sourcePath), 'assets/config.json');

    // Read the config.json file
    const config = tree.readJson(configPath) as JsonObject;

    // Remove gray theme from the supportedThemes array
    removeGrayThemeFromSupportedThemes(config);

    // If the startup theme is gray or gray.accessibility, change it to blue or blue.accessibility respectively
    updateStartupThemeInConfig(config);

    // Write the updated config back to the file
    tree.overwrite(configPath, JSON.stringify(config, null, 2));
  };
}

/**
 * Removes deprecated gray themes from the list of supported themes in the given configuration object.
 *
 * This function mutates the provided `config` object directly by removing:
 * - "cmf.style.gray"
 * - "cmf.style.gray.accessibility"
 *
 * @param config - The configuration object containing the "general.supportedThemes" array.
 */
function removeGrayThemeFromSupportedThemes(config: JsonObject): void {
  removeFromJsonArray((config?.['general'] as JsonObject)?.['supportedThemes'] as JsonArray, [
    'cmf.style.gray',
    'cmf.style.gray.accessibility'
  ]);
}

/**
 * Updates the startup theme in the given configuration object if it matches
 * one of the deprecated gray themes. This function mutates the provided config
 * object directly.
 *
 * Specifically:
 * - "cmf.style.gray" -> "cmf.style.blue"
 * - "cmf.style.gray.accessibility" -> "cmf.style.blue.accessibility"
 *
 * @param config - The configuration object containing the "general.startup.startupTheme" property.
 */
function updateStartupThemeInConfig(config: JsonObject): void {
  // Get the startup object from the config
  const startup = (config?.['general'] as JsonObject)?.['startup'] as JsonObject;

  if (!startup) {
    return;
  }

  // Get the current startup theme
  const startupTheme = startup['startupTheme'] as string;

  // Map of old themes to new themes
  const themeMap: Record<string, string> = {
    'cmf.style.gray': 'cmf.style.blue',
    'cmf.style.gray.accessibility': 'cmf.style.blue.accessibility'
  };

  if (startupTheme && themeMap[startupTheme]) {
    startup['startupTheme'] = themeMap[startupTheme];
  }
}

export default function (): Rule {
  return async (tree: Tree) => {
    const project = await getDefaultApplicationProject(tree);

    if (!project) {
      return;
    }

    return chain([updateThemesInConfigFile({ project })]);
  };
}
