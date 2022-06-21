import { Tree } from "@angular-devkit/schematics";
import { JSONFile } from "./json";

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

export function addPackageJsonDependency(
        tree: Tree,
        dependency: NodeDependency,
        pkgJsonPath = PKG_JSON_PATH,
    ): void {
    const json = new JSONFile(tree, pkgJsonPath);
  
    const { overwrite, type, name, version } = dependency;
    const path = [type, name];
    if (overwrite || !json.get(path)) {
        json.modify(path, version);
    }
}