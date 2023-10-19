import { Rule, SchematicsException, Tree } from '@angular-devkit/schematics';
import { readWorkspace, writeWorkspace } from '@schematics/angular/utility';
import { addToJsonArray, getBuildTargets } from '@criticalmanufacturing/schematics-devkit';

/**
 * Adds the assets to the desired application or to the default application project
 */
export function addApplicationAssets(options: { project: string; assets: any[] }): Rule {
  return async (tree: Tree) => {
    const workspace = await readWorkspace(tree);
    const project = workspace.projects.get(options.project);

    // if there is no project defined, we are done.
    if (!project) {
      throw new SchematicsException(`Project "${options.project}" does not exist.`);
    }

    const buildTargets = getBuildTargets(project);

    // Configure project options
    for (const target of buildTargets) {
      // override options
      if (target.options) {
        // Add assets
        if (target.options.assets instanceof Array) {
          addToJsonArray(target.options.assets, options.assets);
        }
      }
    }

    await writeWorkspace(tree, workspace);
  };
}
