import { join, JsonArray, JsonObject, normalize, isJsonObject } from '@angular-devkit/core';
import { Rule, SchematicsException, Tree } from '@angular-devkit/schematics';
import {
  addToJsonArray,
  getBuildTargets,
  removeFromJsonArray
} from '@criticalmanufacturing/schematics-devkit';
import { readWorkspace, writeWorkspace } from '@schematics/angular/utility';
import { isDeepStrictEqual } from 'node:util';

export const OLD_THEMES = [
  'cmf.style.blue',
  'cmf.style.blue.accessibility',
  'cmf.style.gray',
  'cmf.style.gray.accessibility'
];

export const NEW_THEMES = ['cmf.style.light', 'cmf.style.light.accessibility'];

// Map of old themes to new themes
const THEME_MAP: Record<string, string> = {
  'cmf.style.gray': 'cmf.style.light',
  'cmf.style.gray.accessibility': 'cmf.style.light.accessibility',
  'cmf.style.blue': 'cmf.style.light',
  'cmf.style.blue.accessibility': 'cmf.style.light.accessibility'
};

/**
 * Update themes in the application's assets/config.json.
 *
 * - Removes deprecated gray and blue themes from "general.supportedThemes".
 * - Replaces deprecated startup themes:
 *   "cmf.style.gray" -> "cmf.style.light"
 *   "cmf.style.gray.accessibility" -> "cmf.style.light.accessibility"
 *   "cmf.style.blue" -> "cmf.style.light"
 *   "cmf.style.blue.accessibility" -> "cmf.style.light.accessibility"
 *
 * @param options The options for the schematic.
 * @returns A Rule that performs the update when applied to a Tree.
 */
export function updateThemesInConfigFile(options: { project: string }): Rule {
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

    if (tree.exists(configPath)) {
      // Read the config.json file
      const config = tree.readJson(configPath) as JsonObject;

      // Remove gray and blue themes from the supportedThemes array
      removeGrayAndBlueThemeFromSupportedThemes(config);

      // Add the light theme to the supportedThemes array if not already present
      addLightThemeToSupportedThemes(config);

      // If the startup theme is gray or blue, change it to light theme (including accessibility variants).
      updateStartupThemeInConfig(config);

      // Write the updated config back to the file
      tree.overwrite(configPath, JSON.stringify(config, null, 2));
    }

    const buildTargets = getBuildTargets(project);

    for (const target of buildTargets) {
      if (target.options?.styles) {
        let stylesStr = JSON.stringify(target.options.styles);

        // replace themes
        Object.entries(THEME_MAP).forEach(([oldVal, newVal]) => {
          stylesStr = stylesStr.replaceAll(oldVal, newVal);
        });

        target.options.styles = JSON.parse(stylesStr);

        // remove duplicates
        target.options.styles = (target.options.styles as JsonArray).filter(
          (item, index, self) =>
            index ===
            self.findIndex((obj) =>
              isJsonObject(obj) ? isDeepStrictEqual({ ...obj }, item) : obj === item
            )
        );
      }
    }

    await writeWorkspace(tree, workspace);
  };
}

/**
 * Removes deprecated gray and blue themes from the list of supported themes in the given configuration object.
 *
 * This function mutates the provided `config` object directly by removing:
 * - "cmf.style.gray"
 * - "cmf.style.gray.accessibility"
 * - "cmf.style.blue"
 * - "cmf.style.blue.accessibility"
 *
 * @param config - The configuration object containing the "general.supportedThemes" array.
 */
function removeGrayAndBlueThemeFromSupportedThemes(config: JsonObject): void {
  removeFromJsonArray(
    (config?.['general'] as JsonObject)?.['supportedThemes'] as JsonArray,
    OLD_THEMES
  );
}

/**
 * Adds the light theme to the list of supported themes in the given configuration object.
 *
 * This function mutates the provided `config` object directly by adding:
 * - "cmf.style.light"
 * - "cmf.style.light.accessibility"
 *
 * @param config - The configuration object containing the "general.supportedThemes" array.
 */
function addLightThemeToSupportedThemes(config: JsonObject): void {
  addToJsonArray((config?.['general'] as JsonObject)?.['supportedThemes'] as JsonArray, NEW_THEMES);
}

/**
 * Updates the startup theme in the given configuration object if it matches
 * one of the deprecated gray themes. This function mutates the provided config
 * object directly.
 *
 * Specifically:
 * - "cmf.style.gray" -> "cmf.style.light"
 * - "cmf.style.gray.accessibility" -> "cmf.style.light.accessibility"
 * - "cmf.style.blue" -> "cmf.style.light"
 * - "cmf.style.blue.accessibility" -> "cmf.style.light.accessibility"
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

  if (startupTheme && THEME_MAP[startupTheme]) {
    startup['startupTheme'] = THEME_MAP[startupTheme];
  }
}
