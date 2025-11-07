import { ProjectDefinition, TargetDefinition, readWorkspace } from '@schematics/angular/utility';
import { Tree } from '@angular-devkit/schematics';
import { exec } from 'child_process';
import { JsonArray } from '@angular-devkit/core';
import { isDeepStrictEqual } from 'node:util';
import { dirname, join, parse } from 'path';
import { existsSync } from 'fs';

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
    if (
      target.builder === '@angular-devkit/build-angular:browser' ||
      target.builder === '@angular-devkit/build-angular:application' ||
      target.builder === '@angular/build:application'
    ) {
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

  const builder = appProject.targets.get('build');

  if (
    builder &&
    ['@angular/build:application', '@angular-devkit/build-angular:application'].some((x) =>
      builder.builder.endsWith(x)
    )
  ) {
    return builder.options?.browser as string | undefined;
  }

  return builder?.options?.main as string | undefined;
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

/**
 * Adds elements to json array if not already present.
 * @param array array of elements
 * @param elementsToAdd elements to add to array
 */
export function addToJsonArray(array: JsonArray, elementsToAdd: any[]): void {
  elementsToAdd.forEach((toAdd) => {
    if (
      !array.some((existing) =>
        isDeepStrictEqual(typeof existing === 'object' ? { ...existing } : existing, toAdd)
      )
    ) {
      array.push(toAdd);
    }
  });
}

/**
 * Remove the provided element from a json array
 * @param array the array
 * @param elementToRemove the element to remove
 */
export function removeFromJsonArray(array: JsonArray, elementsToRemove: any[]): void {
  elementsToRemove.forEach((toRemove) => {
    const indexToRemove = array.findIndex((existing) =>
      isDeepStrictEqual(typeof existing === 'object' ? { ...existing } : existing, toRemove)
    );

    if (indexToRemove >= 0) {
      array.splice(indexToRemove, 1);
    }
  });
}

/**
 * Finds the name of the first application project defined in the worspace
 * @param tree Tree
 * @returns the project name or undefined if not found
 */
export async function getDefaultApplicationProject(tree: Tree): Promise<string | undefined> {
  const workspace = await readWorkspace(tree);

  return Array.from(workspace.projects.entries()).find(([, def]) => {
    return def.extensions.projectType === ProjectType.Application;
  })?.[0];
}

/**
 * Fetches the absolute root directory of the angular workspace
 */
export function tryGetRoot(): string | undefined {
  const from = process.cwd();
  const root = parse(from).root;

  let currentDir = from;
  while (currentDir && currentDir !== root) {
    if (existsSync(join(currentDir, 'angular.json'))) {
      return currentDir;
    }
    currentDir = dirname(currentDir);
  }

  return;
}
