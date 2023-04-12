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

function addPackageJsonDependency(
  tree: Tree,
  dependency: NodeDependency,
  pkgJsonPath = PKG_JSON_PATH
): void {
  const json = new JSONFile(tree, pkgJsonPath);

  const { overwrite, type, name, version } = dependency;
  const path = [type, name];
  if (overwrite || !json.get(path)) {
    json.modify(path, version);
  }
}

/**
 * Installs application dependencies in package.json
 */
export function installDependencies(dependencies: NodeDependency[]): Rule {
  return (tree: Tree, _context: SchematicContext) => {
    dependencies.forEach((dependency) => addPackageJsonDependency(tree, dependency));
    _context.addTask(new NodePackageInstallTask());

    return tree;
  };
}
