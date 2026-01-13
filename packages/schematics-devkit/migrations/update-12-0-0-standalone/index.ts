import { join, relative } from 'node:path';
import { Tree } from '@angular-devkit/schematics';
import {
  findReferences,
  getImportSpecifier,
  getIndentSize,
  insertImports,
  readComponentTemplate,
  tryGetRoot
} from '@criticalmanufacturing/schematics-devkit';
import { Identifier, Node, SourceFile, SyntaxKind } from 'ts-morph';
import { Schema } from './schema';
import { createMigrationProject } from '../migration';
import parse, { HTMLElement } from 'node-html-parser';
import { MODULE_COMPONENT, MODULE_EXPORTS } from './module-configs';

/**
 * Extracts the literal text from a Node if it's a StringLiteral or NoSubstitutionTemplateLiteral.
 *
 * @param node - The Node to extract the literal text from.
 * @returns The literal text of the node if it's a StringLiteral or NoSubstitutionTemplateLiteral, undefined otherwise.
 */
function getLiteralText(node?: Node): string | undefined {
  return (
    node?.asKind(SyntaxKind.StringLiteral)?.getLiteralText() ??
    node?.asKind(SyntaxKind.NoSubstitutionTemplateLiteral)?.getLiteralText()
  );
}

/**
 * Checks if the given Identifier is part of an imports or exports array in an NgModule or Component decorator.
 *
 * @param ref - The Identifier to check
 * @returns True if the Identifier is part of an imports or exports array, false otherwise
 */
function isImportsArray(ref: Identifier): boolean {
  const propertyAssignment = ref
    .getParentIfKind(SyntaxKind.ArrayLiteralExpression)
    ?.getParentIfKind(SyntaxKind.PropertyAssignment);

  if (propertyAssignment?.getName() !== 'imports' && propertyAssignment?.getName() !== 'exports') {
    return false;
  }

  return (
    propertyAssignment
      .getParentIfKind(SyntaxKind.ObjectLiteralExpression)
      ?.getParentIfKind(SyntaxKind.CallExpression)
      ?.getExpression()
      .getText()
      .match(/(NgModule|Component)/) != null
  );
}

/**
 * Processes dynamic imports in the given source file.
 *
 * This function identifies and transforms dynamic imports from 'cmf-core' or 'cmf-mes' packages.
 * It handles two main scenarios:
 * 1. Entity-specific imports: Transforms them to use EntityTypeMetadataService.
 * 2. Regular component imports: Converts them to use the 'loadComponent' syntax.
 *
 * @param source - The SourceFile to process
 * @param modifiedFiles - A Set to track modified files
 */
function processDynamicImports(source: SourceFile, modifiedFiles: Set<SourceFile>): void {
  source.getClasses().forEach((classDec) => {
    if (classDec.getExtends()?.getText() === 'PackageMetadata') {
      // Identify all dynamic imports in the source file
      const dynamicImports = classDec
        .getDescendantsOfKind(SyntaxKind.ImportKeyword)
        .map((node) => node.getParentIfKind(SyntaxKind.CallExpression))
        .filter((node) => node != null);

      dynamicImports.forEach((importExp) => {
        // Extract the import path and check if it's from 'cmf-core' or 'cmf-mes'
        const importPath = getLiteralText(importExp.getArguments()[0]);
        if (!importPath?.match(/^cmf-(core|mes)(?!-ui)(?!.*\/metadata).*$/)) {
          return;
        }

        // Get relevant ancestor nodes
        const arrowFn = importExp.getFirstAncestorByKind(SyntaxKind.ArrowFunction);
        const objectNode = importExp.getFirstAncestorByKind(SyntaxKind.ObjectLiteralExpression);
        const path = getLiteralText(
          objectNode?.getProperty('path')?.asKind(SyntaxKind.PropertyAssignment)?.getInitializer()
        );

        // Process imports within a 'then' clause
        if (importExp.getParentIfKind(SyntaxKind.PropertyAccessExpression)?.getName() === 'then') {
          // Extract the imported component name
          const importNode = importExp
            .getFirstAncestorByKind(SyntaxKind.CallExpression)
            ?.getArguments()[0]
            .asKind(SyntaxKind.ArrowFunction)
            ?.getBody()
            .asKind(SyntaxKind.PropertyAccessExpression)
            ?.getNameNode();

          const pageComponent = importNode?.getText().replace(/RoutingModule$/, '');
          const etName = path?.match(/Entity\/(\w+)\/\:id/)?.[1];

          if (!importNode || !pageComponent) {
            return;
          }

          modifiedFiles.add(source);

          if (etName) {
            // Transform entity-specific imports
            importNode
              .getFirstAncestorByKind(SyntaxKind.CallExpression)
              ?.replaceWithText(
                [
                  `\nEntityTypeMetadataService.getRoutes(`,
                  `  '${etName}',`,
                  `  await import(`,
                  `    /* webpackExports: "${pageComponent}" */`,
                  `    '${importPath}'`,
                  `  ).then((m) => m.${pageComponent})`,
                  `)`
                ].join('\n')
              );

            arrowFn?.setIsAsync(true)?.formatText({ indentSize: getIndentSize(source) });

            insertImports(source, ['EntityTypeMetadataService'], 'cmf-core');
          } else {
            // Transform regular component imports
            const moduleFullText = importExp
              .getArguments()[0]
              .getFullText()
              .replace(/RoutingModule/, '');

            importExp.removeArgument(0);
            importExp.insertArgument(0, moduleFullText);
            importExp.formatText({ indentSize: getIndentSize(source) });

            importExp
              .getFirstAncestorByKind(SyntaxKind.PropertyAssignment)
              ?.getNameNode()
              ?.replaceWithText('loadComponent');

            importNode.replaceWithText(pageComponent);
          }
        }
      });
    }
  });
}

/**
 * Processes static imports in the given source file.
 *
 * This function identifies and transforms static imports from 'cmf-core' or 'cmf-mes' packages.
 * It handles the following scenarios:
 * 1. Modules that export multiple components
 * 2. Modules that export a single component
 * 3. Existing imports with potential naming conflicts
 *
 * The function performs the following main tasks:
 * - Identifies relevant import declarations
 * - Processes each named import in the declarations
 * - Finds references to the imported modules in the source file
 * - Determines required imports based on module exports and template usage
 * - Handles import conflicts and aliases
 * - Removes original module imports and adds new component imports
 * - Updates the source file with new imports
 *
 * @param source - The SourceFile to process
 * @param tree - The Angular Schematics Tree object
 * @param rootDir - The root directory of the project
 * @param modifiedFiles - A Set to track modified files
 */
function processStaticImports(
  source: SourceFile,
  tree: Tree,
  rootDir: string,
  modifiedFiles: Set<SourceFile>
): void {
  // Process each import declaration in the source file
  source.getImportDeclarations().forEach((importDec) => {
    const importPath = importDec.getModuleSpecifierValue();

    // Skip if the import is not from cmf-core or cmf-mes
    if (!importPath.match(/^cmf-(core|mes)(?!-ui)(?!.*\/metadata).*$/)) {
      return;
    }

    // Object to store new imports to be added
    const importsToAdd: Record<string, Set<string>> = {};

    // Process each named import in the import declaration
    importDec.getNamedImports().forEach((importSpecifier) => {
      // Skip if the import is not a Module
      if (!importSpecifier.getName().endsWith('Module')) {
        return;
      }

      // Get the module identifier
      const moduleIdentifier =
        importSpecifier.getAliasNode() ??
        importSpecifier.getNameNode().asKind(SyntaxKind.Identifier);

      if (!moduleIdentifier) {
        return;
      }

      // Find all references to the module in the source file
      findReferences(moduleIdentifier, source).forEach((ref) => {
        const modulePkg = importSpecifier.getName();

        // Process the reference if it's in an imports array from a Component or Module
        if (isImportsArray(ref)) {
          const parentArray = ref.getParentIfKindOrThrow(SyntaxKind.ArrayLiteralExpression);
          const reqImports: Record<string, string[]> = {};
          const modules = MODULE_EXPORTS[importPath]?.[modulePkg];

          // Handle module that export multiple components
          if (modules) {
            // Read the component template
            const template = readComponentTemplate(
              ref.getFirstAncestorByKindOrThrow(SyntaxKind.ClassDeclaration),
              tree,
              rootDir
            );

            let templateHtml: HTMLElement | undefined;
            if (template) {
              templateHtml = parse(template.replaceAll(/[\[\]]/g, ''));
            }

            Object.entries(modules).forEach(([pkg, components]) => {
              Object.entries(components).forEach(([component, selector]) => {
                reqImports[pkg] ??= [];
                if (!templateHtml) {
                  // Add import if we are dealing with a module decorator
                  reqImports[pkg].push(component);
                } else if (templateHtml.querySelector(selector.toLocaleLowerCase())) {
                  // Add import if selector is used in the template
                  reqImports[pkg].push(component);
                }
              });
            });
          } else {
            // Handle module that export single component
            reqImports[importPath] ??= [];
            reqImports[importPath].push(
              MODULE_COMPONENT[importPath]?.[modulePkg] ?? modulePkg.replace(/Module$/, '')
            );
          }

          // Process required imports
          Object.entries(reqImports).forEach(([pkg, newImports]) => {
            newImports.forEach((newImport, index) => {
              const existingImportSpec = getImportSpecifier(newImport, source);
              const existingImportDec = existingImportSpec?.getFirstAncestorByKind(
                SyntaxKind.ImportDeclaration
              );

              // Handle different import scenarios
              if (existingImportDec == null) {
                importsToAdd[pkg] ??= new Set<string>();
                importsToAdd[pkg].add(newImport);
              } else if (existingImportDec.getModuleSpecifierValue() !== pkg) {
                // Identifier already exists, use an alias
                importsToAdd[pkg] ??= new Set<string>();
                importsToAdd[pkg].add(`${newImport} as ${newImport}_1`);

                newImports[index] = `${newImport}_1`;
              } else if (existingImportSpec) {
                // Reuse existing import
                newImports[index] =
                  existingImportSpec.getAliasNode()?.getText() ?? existingImportSpec.getName();
              }
            });
          });

          // Remove the original module import
          parentArray.removeElement(ref);

          // Add new elements to the imports array
          const elementsToAdd = Object.values(reqImports)
            .flat()
            .filter((v) => parentArray.getElements().every((e) => e.getText() !== v));

          if (elementsToAdd.length > 0) {
            parentArray.addElements(elementsToAdd);
          }
        }
      });

      // Remove the original import specifier
      importSpecifier.remove();
    });

    // Add new imports to the source file
    Object.entries(importsToAdd).forEach(([pkg, newImports]) => {
      insertImports(source, [...newImports], pkg);
    });

    // Remove the import declaration if it's empty
    if (importDec.getNamedImports().length === 0) {
      importDec.remove();
    }

    // Mark the file as modified
    modifiedFiles.add(source);
  });
}

export function migrate(options: Schema) {
  return async (tree: Tree) => {
    // Get the root directory and construct the base path
    const rootDir = tryGetRoot();
    const basePath = process.cwd();
    const path = join(basePath, options.path ?? './');

    // Exit if the root directory is not found or the path is outside the root
    if (!rootDir || relative(rootDir, path).startsWith('..')) {
      return;
    }

    // Create a migration project
    const migrationProj = await createMigrationProject(tree, { rootDir, path });

    // Set to keep track of modified files
    const modifiedFiles = new Set<SourceFile>();

    // Iterate through all source files in the project
    migrationProj.getSourceFiles().forEach((source) => {
      processDynamicImports(source, modifiedFiles);
      processStaticImports(source, tree, rootDir, modifiedFiles);
    });

    // Save the changed files
    modifiedFiles.forEach((source) => {
      tree.overwrite(relative(rootDir, source.getFilePath()), source.getFullText());
    });
  };
}
