import { join, normalize } from '@angular-devkit/core';
import {
  apply,
  applyTemplates,
  chain,
  mergeWith,
  move,
  Rule,
  SchematicsException,
  Tree,
  url
} from '@angular-devkit/schematics';
import { readWorkspace } from '@schematics/angular/utility';
import { removeDirectory, removeFile } from '@criticalmanufacturing/schematics-devkit/rules';

export function addConfigJson(options: { project: string }): Rule {
  return async (tree: Tree) => {
    const workspace = await readWorkspace(tree);
    const project = workspace.projects.get(options.project);

    if (!project) {
      throw new SchematicsException(`Project is not defined in this workspace.`);
    }

    // Setup sources for the assets files to add to the project
    const sourcePath = normalize(project.sourceRoot ?? join(normalize(project.root), 'src'));

    const templateSource = apply(url('./files'), [
      applyTemplates({
        startupCulture: 'en-US',
        startupTheme: 'cmf.style.light',
        supportedCultures: `[
      "en-US",
      "pt-PT",
      "de-DE",
      "vi-VN",
      "zh-CN",
      "zh-TW",
      "es-ES",
      "pl-PL",
      "sv-SE",
      "fr-FR"
    ]`,
        supportedThemes: `[
      "cmf.style.light",
      "cmf.style.light.accessibility",
      "cmf.style.dark",
      "cmf.style.dark.accessibility",
      "cmf.style.contrast",
      "cmf.style.contrast.accessibility"
    ]`
      }),
      move(join(normalize(sourcePath), 'assets'))
    ]);

    // ensures that the assets folder is src/assets
    // to keep compatibility with existing tooling
    return chain([
      removeDirectory(join(normalize(project.root), 'public', 'icons')),
      removeFile(join(normalize(project.root), 'public', 'favicon.ico')),
      mergeWith(templateSource)
    ]);
  };
}
