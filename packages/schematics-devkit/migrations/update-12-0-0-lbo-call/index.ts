import { Rule, Tree } from '@angular-devkit/schematics';
import { Schema } from './schema';
import { tryGetRoot } from '../../src/workspace';
import { join, relative } from 'node:path';
import { createMigrationProject } from '../migration';
import { Node, SourceFile, Symbol, SyntaxKind, Type } from 'ts-morph';
import ora from 'ora';

const CMF_CORE_PACKAGE = 'cmf-core';
const LBO_SERVICE_IMPORT = 'LboService';
const CALL_METHOD = 'call';

/**
 * Checks if two ts-morph symbols point to the same declaration.
 */
function isSameSymbol(left: Symbol | undefined, right: Symbol | undefined): boolean {
  if (!left || !right) {
    return false;
  }

  const leftDecl = left.getDeclarations()[0];
  const rightDecl = right.getDeclarations()[0];

  if (!leftDecl || !rightDecl) {
    return false;
  }

  return (
    leftDecl.getSourceFile().getFilePath() === rightDecl.getSourceFile().getFilePath() &&
    leftDecl.getStart() === rightDecl.getStart()
  );
}

/**
 * Validates whether a type resolves to LboService directly or through composed types.
 */
function isLboReceiverType(type: Type, lboSymbol: Symbol): boolean {
  const typesToCheck = [type, type.getApparentType()];
  for (const currentType of typesToCheck) {
    const directSymbol = currentType.getSymbol();
    if (isSameSymbol(directSymbol, lboSymbol)) {
      return true;
    }

    const baseTypes = currentType.getBaseTypes();
    if (baseTypes.some((baseType) => isSameSymbol(baseType.getSymbol(), lboSymbol))) {
      return true;
    }

    const unionTypes = currentType.getUnionTypes();
    if (unionTypes.some((unionType) => isLboReceiverType(unionType, lboSymbol))) {
      return true;
    }

    const intersectionTypes = currentType.getIntersectionTypes();
    if (
      intersectionTypes.some((intersectionType) => isLboReceiverType(intersectionType, lboSymbol))
    ) {
      return true;
    }
  }

  return false;
}

/**
 * Gets the in-file identifier node used for the LboService import, supporting aliases.
 */
function getLboImportNode(source: SourceFile): Node | undefined {
  const lboImport = source
    .getImportDeclarations()
    .find((declaration) => declaration.getModuleSpecifierValue() === CMF_CORE_PACKAGE)
    ?.getNamedImports()
    .find((namedImport) => namedImport.getName() === LBO_SERVICE_IMPORT);

  return (lboImport?.getAliasNode() ?? lboImport?.getNameNode())?.asKind(SyntaxKind.Identifier);
}

/**
 * Resolves the symbol for the imported LboService identifier.
 */
function getLboSymbol(lboImportNode: Node | undefined): Symbol | undefined {
  if (!lboImportNode) {
    return;
  }

  return lboImportNode.getSymbol()?.getAliasedSymbol() ?? lboImportNode.getSymbol();
}

/**
 * Checks whether an initializer is an inject(...) call targeting LboService.
 */
function isInjectLboInitializer(initializer: Node | undefined, lboSymbol: Symbol): boolean {
  const callExp = initializer?.asKind(SyntaxKind.CallExpression);
  if (!callExp || callExp.getExpression().getText() !== 'inject') {
    return false;
  }

  const dependency = callExp.getArguments()[0]?.asKind(SyntaxKind.Identifier);
  if (!dependency) {
    return false;
  }

  const dependencySymbol = dependency.getSymbol()?.getAliasedSymbol() ?? dependency.getSymbol();
  return isSameSymbol(dependencySymbol, lboSymbol);
}

/**
 * Checks whether a declaration is typed as LboService or initialized via inject(LboService).
 */
function isDeclarationTypedAsLbo(declaration: Node, lboSymbol: Symbol): boolean {
  const typeNode =
    declaration.asKind(SyntaxKind.PropertyDeclaration)?.getTypeNode() ??
    declaration.asKind(SyntaxKind.Parameter)?.getTypeNode() ??
    declaration.asKind(SyntaxKind.VariableDeclaration)?.getTypeNode();

  if (typeNode && isLboReceiverType(typeNode.getType(), lboSymbol)) {
    return true;
  }

  const initializer =
    declaration.asKind(SyntaxKind.PropertyDeclaration)?.getInitializer() ??
    declaration.asKind(SyntaxKind.VariableDeclaration)?.getInitializer();

  return isInjectLboInitializer(initializer, lboSymbol);
}

/**
 * Checks whether the receiver declaration can be resolved as LboService.
 */
function isReceiverDeclarationLbo(receiver: Node, lboSymbol: Symbol): boolean {
  const receiverPropertyAccess = receiver.asKind(SyntaxKind.PropertyAccessExpression);
  const receiverSymbol =
    receiver.asKind(SyntaxKind.Identifier)?.getSymbol() ??
    receiverPropertyAccess?.getNameNode().getSymbol();

  if (!receiverSymbol) {
    return false;
  }

  return receiverSymbol
    .getDeclarations()
    .some((declaration) => isDeclarationTypedAsLbo(declaration, lboSymbol));
}

/**
 * Returns the receiver of a call expression when it is a *.call(...) invocation.
 */
function getCallReceiver(callExpression: Node): Node | undefined {
  const expression = callExpression
    .asKind(SyntaxKind.CallExpression)
    ?.getExpression()
    .asKind(SyntaxKind.PropertyAccessExpression);

  if (!expression || expression.getName() !== CALL_METHOD) {
    return;
  }

  return expression.getExpression();
}

/**
 * Determines if a call receiver should be treated as LboService.
 */
function shouldMigrateCall(receiver: Node, lboServiceSymbol: Symbol): boolean {
  return (
    isLboReceiverType(receiver.getType(), lboServiceSymbol) ||
    isReceiverDeclarationLbo(receiver, lboServiceSymbol)
  );
}

/**
 * Determines if a call receiver should be migrated against any discovered LboService symbol.
 */
function shouldMigrateCallForAnyLboServiceSymbol(
  receiver: Node,
  lboServiceSymbols: Symbol[]
): boolean {
  return lboServiceSymbols.some((lboServiceSymbol) =>
    shouldMigrateCall(receiver, lboServiceSymbol)
  );
}

/**
 * Updates usage of LboService.call to no longer invoke with a generic type argument
 * @param options Schema options
 * @returns Schematics Rule
 */
export function migrate(options: Schema): Rule {
  return async (tree: Tree) => {
    const spinner = ora({
      text: 'Migrating LboService call method...'
    }).start();

    try {
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

      // Discover LboService symbols across the project so files without direct imports can still be migrated.
      const lboServiceSymbols = migrationProj
        .getSourceFiles()
        .map((source) => getLboSymbol(getLboImportNode(source)))
        .filter((symbol): symbol is Symbol => Boolean(symbol));

      if (lboServiceSymbols.length === 0) {
        return;
      }

      // Set to keep track of modified files
      const modifiedFiles = new Set<SourceFile>();

      // Iterate through all source files in the project
      migrationProj.getSourceFiles().forEach((source) => {
        source.getDescendantsOfKind(SyntaxKind.CallExpression).forEach((callExpression) => {
          const receiver = getCallReceiver(callExpression);
          if (!receiver) {
            return;
          }

          if (!shouldMigrateCallForAnyLboServiceSymbol(receiver, lboServiceSymbols)) {
            return;
          }

          const typeArgs = callExpression.getTypeArguments();
          if (typeArgs.length > 0) {
            callExpression.removeTypeArgument(0);
            modifiedFiles.add(callExpression.getSourceFile());
          }
        });

        // Save changed files for this source.
        modifiedFiles.forEach((modifiedSource) => {
          tree.overwrite(
            relative(rootDir, modifiedSource.getFilePath()),
            modifiedSource.getFullText()
          );
        });
      });
      spinner.succeed('LboService call method migration completed.');
    } catch (error) {
      spinner.fail('LboService call method migration failed.');
      throw error;
    }
  };
}
