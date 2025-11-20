import { join, relative } from 'node:path';
import { CallExpression, Node, ParameterDeclaration, Project, SourceFile } from 'ts-morph';
import { RealFileSystemHost, SyntaxKind } from '@ts-morph/common';
import {
  findReferences,
  getImportPath,
  tryGetRoot
} from '@criticalmanufacturing/schematics-devkit';
import { Tree } from '@angular-devkit/schematics';
import { readWorkspace } from '@schematics/angular/utility';

/**
 * Checks if a given node is a parameter declaration without any modifiers.
 *
 * @param node - The node to check.
 * @returns True if the node is a parameter declaration without modifiers, false otherwise.
 */
function isParamWithoutModifier(node: Node): node is ParameterDeclaration {
  return node.isKind(SyntaxKind.Parameter) && node.getModifiers().length === 0;
}

/**
 * Creates a migration project by setting up a custom file system and adding source files.
 *
 * @param tree - The Angular schematic Tree object representing the file system.
 * @param options - An object containing the root directory and migration path.
 * @param options.rootDir - The root directory of the project.
 * @param options.migrationPath - The path where the migration should be applied.
 * @returns A Promise that resolves to a ts-morph Project instance.
 */
async function createMigrationProject(
  tree: Tree,
  options: { rootDir: string; migrationPath: string }
): Promise<Project> {
  const { rootDir, migrationPath } = options;
  const fileSystem = new RealFileSystemHost();

  // override the native read file so the files are fetched from the tree
  // since they can contain pending changes
  const nativeReadFile = fileSystem.readFileSync;
  fileSystem.readFileSync = (filePath, encoding) => {
    const treePath = relative(rootDir, filePath);

    if (treePath.startsWith('..')) {
      return nativeReadFile(filePath, encoding);
    }

    return tree.readText(treePath);
  };

  const tsProject = new Project({ fileSystem: fileSystem });

  const workspace = await readWorkspace(tree);

  // add all source files under the specified path
  workspace.projects.forEach((proj) => {
    const srcRoot = join(rootDir, proj.root);
    if (
      relative(migrationPath, srcRoot).startsWith('..') &&
      relative(srcRoot, migrationPath).startsWith('..')
    ) {
      return;
    }

    tsProject.addSourceFilesAtPaths(
      relative(migrationPath, srcRoot).startsWith('..')
        ? join(migrationPath, '**/*.ts')
        : join(srcRoot, '**/*.ts')
    );
  });

  return tsProject;
}

/**
 * Removes the arguments from a super() call in a constructor and cleans up unused references.
 *
 * @param superExpression - The CallExpression node representing the super() call
 */
function removeSuperArguments(superExpression: CallExpression): void {
  const constructorNode = superExpression.getFirstAncestorByKind(SyntaxKind.Constructor);

  if (!constructorNode) {
    return;
  }

  superExpression
    .getArguments()
    .filter((node) => node.isKind(SyntaxKind.Identifier))
    .map((arg) => {
      // find all the references of the parameter
      const refs = Array.from(
        new Set([...findReferences(arg, constructorNode).map((node) => node.getParent())])
      );

      // filter the references that can be safely removed
      const nodesToRemove = refs.filter(
        (ref) =>
          ref != null &&
          (ref.isKind(SyntaxKind.JSDocParameterTag) ||
            ref.isKind(SyntaxKind.VariableDeclaration) ||
            isParamWithoutModifier(ref))
      );

      // do not remove the parameter references if they are used in other expressions
      if (nodesToRemove.length === refs.length) {
        return nodesToRemove;
      }

      return [];
    })
    .flat()
    .forEach((node) => {
      // remove super parameters references
      if (node.isKind(SyntaxKind.Parameter)) {
        const typeIndentifier = node.getTypeNode()?.getFirstChildIfKind(SyntaxKind.Identifier);

        if (typeIndentifier) {
          // remove parameter type references
          const typeRefs = Array.from(
            new Set(
              findReferences(typeIndentifier, superExpression.getSourceFile()).map((node) =>
                node.getParent()
              )
            )
          );

          const refsToRemove = typeRefs.filter(
            (ref) => ref != null && ref.isKind(SyntaxKind.ImportSpecifier)
          );

          if (refsToRemove.length === typeRefs.length) {
            refsToRemove.forEach((ref) => {
              ref.remove();
            });
          }
        }
      }

      node.remove();
    });

  // remove all super arguments
  superExpression.replaceWithText('super()');

  // remove constructor if empty
  if (
    constructorNode.getParameters()?.length === 0 &&
    constructorNode
      .getBody()
      ?.getText()
      .match(/^\s*\{\s*super\(\);?\s*\}\s*$/)
  ) {
    constructorNode.remove();
  }
}

/**
 * Performs a migration operation on the source files by removing the super arguments.
 *
 * @param options - An object containing the migration options.
 * @param options.path - The path to the directory where the migration should be applied.
 * If undefined, the current directory will be used.
 * @returns An async function that takes a Tree object and performs the migration.
 */
export function migrate(options: { path: string | undefined }) {
  return async (tree: Tree) => {
    const rootDir = tryGetRoot();
    const basePath = process.cwd();
    const migrationPath = join(basePath, options.path ?? './');

    if (!rootDir || relative(rootDir, migrationPath).startsWith('..')) {
      return;
    }

    const migrationProj = await createMigrationProject(tree, { rootDir, migrationPath });

    const modifiedFiles = new Set<SourceFile>();

    migrationProj.getSourceFiles().forEach((source) => {
      // skip source files outside the tree
      if (
        relative(rootDir, source.getFilePath()).startsWith('..') ||
        source.getFilePath().includes('node_modules')
      ) {
        return;
      }

      source.getClasses().forEach((classNode) => {
        const extendsNode = classNode.getExtends();

        if (!extendsNode) {
          return;
        }

        const importPath = getImportPath(extendsNode);

        // we only want to process extends classes from the cmf packages
        if (!importPath?.startsWith('cmf-')) {
          return;
        }

        classNode.getConstructors().forEach((constructorNode) => {
          const superExpression = constructorNode
            .getFirstDescendantByKind(SyntaxKind.SuperKeyword)
            ?.getParent()
            ?.asKind(SyntaxKind.CallExpression);

          if (!superExpression || superExpression.getArguments().length === 0) {
            return;
          }

          removeSuperArguments(superExpression);

          modifiedFiles.add(source);
        });
      });
    });

    // save the changed files
    modifiedFiles.forEach((source) => {
      tree.overwrite(relative(rootDir, source.getFilePath()), source.getFullText());
    });
  };
}
