import { isJsonObject } from '@angular-devkit/core';
import { Rule, SchematicContext, Tree } from '@angular-devkit/schematics';
import { NodePackageInstallTask } from '@angular-devkit/schematics/tasks';
import { JSONFile } from '@criticalmanufacturing/schematics-devkit';

const PKG_JSON_PATH = '/package.json';

export enum NodeDependencyType {
  Default = 'dependencies',
  Dev = 'devDependencies',
  Peer = 'peerDependencies',
  Optional = 'optionalDependencies'
}

export interface NodeDependency {
  type: NodeDependencyType;
  name: string;
  version: string;
  overwrite?: boolean;
}

/**
 * Returns the information about an dependency searching by name
 * @param tree Tree
 * @param name the name of the dependency
 * @param pkgJsonPath the path to the package.json file
 */
export function getInstalledDependency(
  tree: Tree,
  name: string,
  pkgJsonPath = PKG_JSON_PATH
): NodeDependency | undefined {
  const json = new JSONFile(tree, pkgJsonPath);
  for (const type of Object.values(NodeDependencyType)) {
    const dep = json.get([type, name]);

    if (typeof dep === 'string') {
      return {
        name: name,
        type: type,
        version: dep
      };
    }
  }
}

function removeDependency(
  tree: Tree,
  dependency: NodeDependency,
  pkgJsonPath = PKG_JSON_PATH
): void {
  const json = new JSONFile(tree, pkgJsonPath);

  if (json.get([dependency.type, dependency.name])) {
    const deps = json.get([dependency.type]);

    if (!deps || !isJsonObject(deps)) {
      return;
    }

    delete deps[dependency.name];

    json.modify([dependency.type], deps);
  }
}

function addDependency(tree: Tree, dependency: NodeDependency, pkgJsonPath = PKG_JSON_PATH): void {
  const { overwrite, type, name, version } = dependency;
  const path = [type, name];

  const installedDep = getInstalledDependency(tree, name, pkgJsonPath);

  if (!overwrite && installedDep) {
    return;
  }

  if (overwrite && installedDep) {
    removeDependency(tree, installedDep, pkgJsonPath);
  }

  const json = new JSONFile(tree, pkgJsonPath);
  json.modify(path, version);
}

/**
 * Installs application dependencies in package.json
 */
export function installDependencies(dependencies: NodeDependency[]): Rule {
  return (tree: Tree, _context: SchematicContext) => {
    dependencies.forEach((dependency) => addDependency(tree, dependency));
    _context.addTask(new NodePackageInstallTask());

    return tree;
  };
}
