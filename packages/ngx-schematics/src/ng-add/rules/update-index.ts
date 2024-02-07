import { Rule, SchematicsException, Tree } from '@angular-devkit/schematics';
import { readWorkspace } from '@schematics/angular/utility';
import { parse } from 'node-html-parser';
import { getBuildTargets } from '@criticalmanufacturing/schematics-devkit';

/**
 * Finds and updates all of the project index.html files
 * 1. Updates the app title to 'MES'
 * 2. Inserts the base themes in the head
 * 3. Inserts the loading container in the body in each file
 */
export function updateIndexFiles(options: { project: string }): Rule {
  return async (tree: Tree) => {
    const workspace = await readWorkspace(tree);
    const project = workspace.projects.get(options.project);

    if (!project) {
      throw new SchematicsException(`Project is not defined in this workspace.`);
    }

    const buildTargets = getBuildTargets(project);

    const indexFiles: string[] = [];

    for (const target of buildTargets) {
      if (typeof target.options?.index === 'string') {
        indexFiles.push(target.options.index);
      }

      if (!target.configurations) {
        continue;
      }

      for (const options of Object.values(target.configurations)) {
        if (typeof options?.index === 'string') {
          indexFiles.push(options.index);
        }
      }
    }

    for (const path of indexFiles) {
      const indexText = tree.readText(path);
      const index = parse(indexText, { comment: true });

      const title = index.querySelector('head > title');
      if (title) {
        title.textContent = 'MES';
      }

      const body = index.querySelector('body');
      if (body && !body.querySelector('div#loading-container')) {
        body.insertAdjacentHTML(
          'afterbegin',
          `
  <div id="loading-container" class="cmf-loading-container">
    <div class="cmf-loading-center">
      <div class="cmf-loading-cmf-logo"></div>
      <div class="cmf-loading-spinner"></div>
    </div>
  </div>`
        );
      }

      tree.overwrite(path, index.toString());
    }
  };
}
