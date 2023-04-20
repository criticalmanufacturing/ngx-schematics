import { ProjectDefinition, TargetDefinition, readWorkspace } from '@schematics/angular/utility';
import { Tree } from '@angular-devkit/schematics';
import { exec } from 'child_process';

/**
 * Project Type
 */
export enum ProjectType {
  Application = 'application',
  Library = 'library'
}

/**
 * Gets the build targets of a project
 * @param project project definition
 */
export function getBuildTargets(project: ProjectDefinition): TargetDefinition[] {
  const targets = [];

  for (const target of project.targets.values()) {
    if (target.builder === '@angular-devkit/build-angular:browser') {
      targets.push(target);
    }
  }

  return targets;
}

/**
 * Build a default project path for generating.
 * @param project The project which will have its default path generated.
 */
export function getDefaultPath(project: ProjectDefinition): string {
  const root = project.sourceRoot ? `/${project.sourceRoot}/` : `/${project.root}/src/`;
  const projectDirName =
    project.extensions['projectType'] === ProjectType.Application ? 'app' : 'lib';

  return `${root}${projectDirName}`;
}

/**
 * Finds the main file path for an app project
 * @param tree Tree
 * @param project application project name
 */
export async function getMainPath(tree: Tree, project: string): Promise<string | undefined> {
  const workspace = await readWorkspace(tree);
  const appProject = workspace.projects.get(project);

  if (appProject?.extensions.projectType !== ProjectType.Application) {
    return;
  }

  return appProject.targets.get('build')?.options?.main as string;
}

/**
 * List ngx-schematics release tags of the current version
 */
export function listNpmReleaseTags(pkg: string, version?: string): Promise<string[]> {
  return new Promise<string[]>((resolve, reject) => {
    exec(`npm dist-tag ls ${pkg}`, (error, stdout, stderr) => {
      if (error) {
        return reject(new Error(stderr));
      }

      const regExp = /^([^:]+): (.+)$/gm;
      let match: RegExpExecArray | null;
      let tags: string[] = [];
      while ((match = regExp.exec(stdout))) {
        if (!version || match[2] === version) {
          tags.push(match[1]);
        }
      }

      return resolve(tags.reverse());
    });
  });
}
