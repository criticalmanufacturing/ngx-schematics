import { basename, dirname, join, normalize, Path, relative, split } from "@angular-devkit/core";
import { Tree } from "@angular-devkit/schematics";
import { ProjectDefinition, readWorkspace } from "@schematics/angular/utility";
import { ts } from "ts-morph";
import { findBootstrapModulePath } from "./ast";

/**
 * Name Location
 */
export interface NameLocation {
    name: string;
    path: string;
}

/**
 * Project Type
 */
export enum ProjectType {
    Application = "application",
    Library = "library"
}

/**
 * Build a default project path for generating.
 * @param project The project which will have its default path generated.
 */
export function buildDefaultPath(project: ProjectDefinition): string {
    const root = project.sourceRoot ? `/${project.sourceRoot}/` : `/${project.root}/src/`;
    const projectDirName = project.extensions['projectType'] === ProjectType.Application ? 'app' : 'lib';

    return `${root}${projectDirName}`;
}


/**
 * Builds the relative path from one path to another
 * @param from From Path
 * @param to To Path
 */
export function buildRelativePath(from: Path, to: Path): string {
    let relativePath: string = relative(from, to);

    if (!relativePath.startsWith('.')) {
        relativePath = `./` + relativePath;
    }

    return relativePath;
}

/**
 * Extracts the name from the provided path
 * @param path 
 * @param name 
 */
export function parseName(path: string, name: string): NameLocation {
    const nameWithoutPath = basename(normalize(name));
    const namePath = dirname(join(normalize(path), name));

    return {
        name: nameWithoutPath,
        path: normalize('/' + namePath),
    };
}

export async function getMainPath(host: Tree): Promise<string | undefined> {
    const workspace = await readWorkspace(host);

    const appProject = Array.from(workspace.projects.values())
        .find(project => project.extensions.projectType === ProjectType.Application);

    if (!appProject) {
        return;
    }

    return appProject.targets.get('build')?.options?.main as string;
}

export async function getAppModulePath(host: Tree): Promise<string | undefined> {
    const mainPath = await getMainPath(host);

    if (!mainPath) {
        return;
    }

    const mainContent = host.get(mainPath)?.content.toString('utf8');

    if (!mainContent) {
        return;
    }

    return findBootstrapModulePath(ts.createSourceFile(mainPath, mainContent, ts.ScriptTarget.Latest));
}

export function relativePathToWorkspaceRoot(projectRoot: string | undefined): string {
    const normalizedPath = split(normalize(projectRoot || ''));

    if (normalizedPath.length === 0 || !normalizedPath[0]) {
        return '.';
    } else {
        return normalizedPath.map(() => '..').join('/');
    }
}