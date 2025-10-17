import { join, normalize } from '@angular-devkit/core';
import { Rule, Tree } from '@angular-devkit/schematics';
import { readWorkspace } from '@schematics/angular/utility';

/**
 * Updates the web manifest file by modifying icon paths to have the 'assets/' path perfix.
 */
export function updateWebmanifest(options: { project: string }): Rule {
  return async (tree: Tree) => {
    const workspace = await readWorkspace(tree);
    const project = workspace.projects.get(options.project);

    if (!project || project.extensions['projectType'] !== 'application') {
      return;
    }

    const manifestPath = join(normalize(project.root), '/public/manifest.webmanifest');
    const manifest = tree.readJson(manifestPath);

    if (typeof manifest !== 'object' || Array.isArray(manifest) || manifest == null) {
      return;
    }

    if (!Array.isArray(manifest.icons)) {
      return;
    }

    manifest.icons.forEach((icon) => {
      if (typeof icon === 'object' && !Array.isArray(icon) && typeof icon?.src === 'string') {
        icon.src = 'assets/' + icon.src;
      }
    });

    tree.overwrite(manifestPath, JSON.stringify(manifest, undefined, 2));
  };
}
